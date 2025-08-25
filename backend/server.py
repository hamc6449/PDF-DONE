from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import FileResponse, StreamingResponse
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timezone
import tempfile
import io
import base64
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="PDFLux - Advanced PDF Management with AI",
    description="Complete PDF management suite with AI-powered features",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic Models
class DocumentMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    size: int
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    page_count: Optional[int] = None
    tags: List[str] = []
    description: Optional[str] = None

class ChatMessage(BaseModel):
    role: str = Field(..., regex="^(system|user|assistant)$")
    content: str = Field(..., min_length=1)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    document_id: Optional[str] = None
    messages: List[ChatMessage]
    model_provider: str = Field(default="openai", regex="^(openai|anthropic|gemini)$")
    model_name: str = Field(default="gpt-4o-mini")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)

class ChatResponse(BaseModel):
    message: ChatMessage
    model_used: str
    processing_time: float

class AITaskRequest(BaseModel):
    document_id: str
    task_type: str = Field(..., regex="^(summarize|extract_key_points|rewrite|analyze|translate|compress_suggestions)$")
    additional_instructions: Optional[str] = None
    model_provider: str = Field(default="openai")
    model_name: str = Field(default="gpt-4o-mini")

class AITaskResponse(BaseModel):
    task_id: str
    task_type: str
    result: str
    processing_time: float
    document_id: str

class ModelProvider(BaseModel):
    name: str
    available_models: List[str]
    status: str

class PDFConversionRequest(BaseModel):
    document_id: str
    target_format: str = Field(..., regex="^(word|excel|powerpoint|txt|html|image)$")
    quality: Optional[str] = Field(default="high", regex="^(low|medium|high)$")

class PDFCompressionRequest(BaseModel):
    document_id: str
    compression_level: str = Field(default="medium", regex="^(low|medium|high|maximum)$")

class PDFSecurityRequest(BaseModel):
    document_id: str
    password: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None

class OCRRequest(BaseModel):
    document_id: str
    language: str = Field(default="eng")
    output_format: str = Field(default="text", regex="^(text|json|searchable_pdf)$")

# AI Service Manager
class AIServiceManager:
    def __init__(self):
        self.api_key = os.getenv('EMERGENT_LLM_KEY')
        self.available_providers = {
            'openai': ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini'],
            'anthropic': ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
            'gemini': ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
        }
    
    async def chat_with_document(self, messages: List[Dict], document_content: str = None, 
                               provider: str = "openai", model: str = "gpt-4o-mini") -> str:
        """Chat with AI about document content"""
        try:
            # Initialize chat session
            session_id = str(uuid.uuid4())
            system_message = "You are an AI assistant specialized in PDF document analysis and management. You can help with summarization, extraction, editing suggestions, and answering questions about documents."
            
            if document_content:
                system_message += f"\n\nCurrent document content:\n{document_content[:8000]}"  # Limit context
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            ).with_model(provider, model)
            
            # Convert messages to proper format
            formatted_messages = []
            for msg in messages:
                if msg['role'] != 'system':  # Skip system messages as we handle them above
                    formatted_messages.append(UserMessage(text=msg['content']))
            
            # Get response for the last message
            if formatted_messages:
                response = await chat.send_message(formatted_messages[-1])
                return response
            else:
                return "No valid messages provided."
                
        except Exception as e:
            logger.error(f"AI chat error: {e}")
            raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    
    async def perform_ai_task(self, document_content: str, task_type: str, 
                            additional_instructions: str = None, provider: str = "openai", 
                            model: str = "gpt-4o-mini") -> str:
        """Perform AI tasks on document"""
        try:
            # Define task prompts
            task_prompts = {
                "summarize": "Please provide a comprehensive summary of this document, highlighting the key points, main arguments, and important details.",
                "extract_key_points": "Extract and list the key points, important facts, and main takeaways from this document in a structured format.",
                "rewrite": "Rewrite this document to improve clarity, readability, and flow while maintaining the original meaning and key information.",
                "analyze": "Analyze this document thoroughly, including its structure, arguments, evidence, tone, and provide insights about its content and quality.",
                "translate": "Translate this document to English if it's in another language, or provide language analysis if it's already in English.",
                "compress_suggestions": "Analyze this document and suggest ways to compress or reduce its size while maintaining essential information and readability."
            }
            
            base_prompt = task_prompts.get(task_type, "Analyze this document:")
            
            if additional_instructions:
                prompt = f"{base_prompt}\n\nAdditional instructions: {additional_instructions}\n\nDocument content:\n{document_content[:10000]}"
            else:
                prompt = f"{base_prompt}\n\nDocument content:\n{document_content[:10000]}"
            
            # Initialize chat for AI task
            session_id = str(uuid.uuid4())
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="You are an expert document processor specialized in PDF analysis, editing, and optimization."
            ).with_model(provider, model)
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            return response
            
        except Exception as e:
            logger.error(f"AI task error: {e}")
            raise HTTPException(status_code=500, detail=f"AI task failed: {str(e)}")

# Initialize AI service
ai_service = AIServiceManager()

# PDF Processing Utilities
class PDFProcessor:
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "pdflux"
        self.temp_dir.mkdir(exist_ok=True)
    
    async def extract_text_from_pdf(self, file_path: Path) -> str:
        """Extract text content from PDF"""
        try:
            import PyPDF2
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"PDF text extraction error: {e}")
            return ""
    
    async def get_pdf_info(self, file_path: Path) -> Dict:
        """Get PDF information"""
        try:
            import PyPDF2
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                return {
                    "page_count": len(pdf_reader.pages),
                    "metadata": pdf_reader.metadata or {},
                    "encrypted": pdf_reader.is_encrypted
                }
        except Exception as e:
            logger.error(f"PDF info extraction error: {e}")
            return {"page_count": 0, "metadata": {}, "encrypted": False}

# Initialize PDF processor
pdf_processor = PDFProcessor()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "PDFLux API - Advanced PDF Management with AI"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "ai_providers": ai_service.available_providers,
        "version": "1.0.0"
    }

@api_router.get("/ai/providers", response_model=List[ModelProvider])
async def get_ai_providers():
    """Get available AI providers and models"""
    providers = []
    for name, models in ai_service.available_providers.items():
        providers.append(ModelProvider(
            name=name,
            available_models=models,
            status="available"
        ))
    return providers

@api_router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process PDF document"""
    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique ID and save file
        doc_id = str(uuid.uuid4())
        file_path = pdf_processor.temp_dir / f"{doc_id}.pdf"
        
        # Save uploaded file
        content = await file.read()
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Extract PDF information
        pdf_info = await pdf_processor.get_pdf_info(file_path)
        text_content = await pdf_processor.extract_text_from_pdf(file_path)
        
        # Create document metadata
        doc_metadata = DocumentMetadata(
            id=doc_id,
            filename=file.filename,
            size=len(content),
            page_count=pdf_info.get("page_count", 0)
        )
        
        # Store in database
        doc_data = doc_metadata.dict()
        doc_data['text_content'] = text_content
        doc_data['file_path'] = str(file_path)
        doc_data['pdf_info'] = pdf_info
        
        await db.documents.insert_one(doc_data)
        
        return {
            "document_id": doc_id,
            "filename": file.filename,
            "size": len(content),
            "page_count": pdf_info.get("page_count", 0),
            "status": "uploaded",
            "text_preview": text_content[:500] + "..." if len(text_content) > 500 else text_content
        }
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.get("/documents")
async def list_documents():
    """List all uploaded documents"""
    try:
        documents = await db.documents.find().to_list(100)
        return [
            {
                "id": doc["id"],
                "filename": doc["filename"],
                "size": doc["size"],
                "upload_date": doc["upload_date"],
                "page_count": doc.get("page_count", 0),
                "tags": doc.get("tags", [])
            }
            for doc in documents
        ]
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@api_router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get document details"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Return document info without full text content
        return {
            "id": doc["id"],
            "filename": doc["filename"],
            "size": doc["size"],
            "upload_date": doc["upload_date"],
            "page_count": doc.get("page_count", 0),
            "tags": doc.get("tags", []),
            "description": doc.get("description"),
            "pdf_info": doc.get("pdf_info", {}),
            "text_preview": doc.get("text_content", "")[:1000] + "..." if len(doc.get("text_content", "")) > 1000 else doc.get("text_content", "")
        }
        
    except Exception as e:
        logger.error(f"Get document error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")

@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest):
    """Chat with AI about documents"""
    try:
        start_time = datetime.now(timezone.utc)
        
        # Get document content if document_id is provided
        document_content = None
        if request.document_id:
            doc = await db.documents.find_one({"id": request.document_id})
            if doc:
                document_content = doc.get("text_content", "")
        
        # Convert messages to dict format
        messages = [msg.dict() for msg in request.messages]
        
        # Get AI response
        ai_response = await ai_service.chat_with_document(
            messages=messages,
            document_content=document_content,
            provider=request.model_provider,
            model=request.model_name
        )
        
        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        # Create response message
        response_message = ChatMessage(
            role="assistant",
            content=ai_response
        )
        
        # Store chat history
        chat_record = {
            "id": str(uuid.uuid4()),
            "document_id": request.document_id,
            "messages": messages + [response_message.dict()],
            "model_used": f"{request.model_provider}:{request.model_name}",
            "processing_time": processing_time,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.chat_history.insert_one(chat_record)
        
        return ChatResponse(
            message=response_message,
            model_used=f"{request.model_provider}:{request.model_name}",
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@api_router.post("/ai/tasks", response_model=AITaskResponse)
async def perform_ai_task(request: AITaskRequest):
    """Perform AI tasks on documents"""
    try:
        start_time = datetime.now(timezone.utc)
        
        # Get document
        doc = await db.documents.find_one({"id": request.document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document_content = doc.get("text_content", "")
        if not document_content:
            raise HTTPException(status_code=400, detail="No text content available for this document")
        
        # Perform AI task
        result = await ai_service.perform_ai_task(
            document_content=document_content,
            task_type=request.task_type,
            additional_instructions=request.additional_instructions,
            provider=request.model_provider,
            model=request.model_name
        )
        
        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds()
        task_id = str(uuid.uuid4())
        
        # Store task result
        task_record = {
            "id": task_id,
            "document_id": request.document_id,
            "task_type": request.task_type,
            "result": result,
            "additional_instructions": request.additional_instructions,
            "model_used": f"{request.model_provider}:{request.model_name}",
            "processing_time": processing_time,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.ai_tasks.insert_one(task_record)
        
        return AITaskResponse(
            task_id=task_id,
            task_type=request.task_type,
            result=result,
            processing_time=processing_time,
            document_id=request.document_id
        )
        
    except Exception as e:
        logger.error(f"AI task error: {e}")
        raise HTTPException(status_code=500, detail=f"AI task failed: {str(e)}")

@api_router.get("/documents/{document_id}/download")
async def download_document(document_id: str):
    """Download original document"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        file_path = doc.get("file_path")
        if not file_path or not Path(file_path).exists():
            raise HTTPException(status_code=404, detail="Document file not found")
        
        return FileResponse(
            path=file_path,
            filename=doc["filename"],
            media_type='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """Delete document and associated data"""
    try:
        doc = await db.documents.find_one({"id": document_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete file
        file_path = doc.get("file_path")
        if file_path and Path(file_path).exists():
            Path(file_path).unlink()
        
        # Delete from database
        await db.documents.delete_one({"id": document_id})
        await db.chat_history.delete_many({"document_id": document_id})
        await db.ai_tasks.delete_many({"document_id": document_id})
        
        return {"message": "Document deleted successfully", "document_id": document_id}
        
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()