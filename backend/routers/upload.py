import os
import uuid

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File

router = APIRouter(prefix="/api/v1", tags=["upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accept a multipart file upload, save it to the uploads directory,
    and return a mock file URL.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Generate a unique filename to avoid collisions
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    try:
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    file_url = f"/uploads/{unique_name}"
    return {
        "filename": unique_name,
        "original_filename": file.filename,
        "url": file_url,
        "size": len(content),
        "content_type": file.content_type,
    }
