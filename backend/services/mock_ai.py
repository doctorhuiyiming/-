import asyncio
import json
import logging
import random
import uuid
from datetime import datetime

from database import SessionLocal
from models import Asset, GenerationTask, Project, Slice

logger = logging.getLogger(__name__)

MOCK_SLICES = [
    {
        "index": "1-1",
        "start": "00:00:00",
        "end": "00:00:03",
        "description": "角色走入房间，四处张望",
        "dialogue": [{"speaker": "主角", "text": "哇，这里好大！", "translated": "Wow, this place is huge!"}],
    },
    {
        "index": "1-2",
        "start": "00:00:03",
        "end": "00:00:06",
        "description": "角色坐在沙发上叹气",
        "dialogue": [{"speaker": "主角", "text": "哎，真累。", "translated": "Ugh, so tired."}],
    },
    {
        "index": "1-3",
        "start": "00:00:06",
        "end": "00:00:10",
        "description": "老人走进，与主角对视",
        "dialogue": [
            {
                "speaker": "老人",
                "text": "老夫人给您安排了住所。",
                "translated": "The old madame has arranged lodging for you.",
            }
        ],
    },
    {
        "index": "1-4",
        "start": "00:00:10",
        "end": "00:00:14",
        "description": "主角靠窗远眺，若有所思",
        "dialogue": [{"speaker": "主角", "text": "好的，我知道了。", "translated": "Okay, I understand."}],
    },
    {
        "index": "1-5",
        "start": "00:00:14",
        "end": "00:00:17",
        "description": "两人并排走廊行走",
        "dialogue": [{"speaker": "旁白", "text": "（沉默）", "translated": "(Silence)"}],
    },
    {
        "index": "1-6",
        "start": "00:00:17",
        "end": "00:00:20",
        "description": "特写：主角握紧拳头",
        "dialogue": [{"speaker": "主角", "text": "我一定要成功。", "translated": "I will succeed."}],
    },
]

MOCK_ASSETS = [
    {
        "type": "character",
        "orig_name": "主角",
        "orig_desc": "清纯女性，黑色长发，穿着传统汉服",
        "new_name": "Elena",
        "new_desc": "Elegant young woman, blonde hair, wearing a modern Western dress",
    },
    {
        "type": "character",
        "orig_name": "老人",
        "orig_desc": "慈祥老妇人，白发，穿着传统旗袍",
        "new_name": "Margaret",
        "new_desc": "Kind elderly woman, silver hair, wearing a Victorian-era dress",
    },
]


async def simulate_parsing(project_id: str, sse_manager):
    """
    Simulate video parsing: wait 3 seconds, create mock slices and assets,
    update project status to 待确认, then fire SSE event.
    """
    logger.info(f"[mock_ai] simulate_parsing started for project={project_id}")
    await asyncio.sleep(3)

    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            logger.warning(f"[mock_ai] project {project_id} not found during parsing")
            return

        # Create mock assets
        for asset_data in MOCK_ASSETS:
            asset = Asset(
                id=str(uuid.uuid4()),
                project_id=project_id,
                asset_type=asset_data["type"],
                original_name=asset_data["orig_name"],
                original_description=asset_data["orig_desc"],
                new_name=asset_data["new_name"],
                new_description=asset_data["new_desc"],
                is_confirmed=False,
            )
            db.add(asset)

        # Create mock slices
        for slice_data in MOCK_SLICES:
            slice_id = f"{project_id}_{slice_data['index']}"
            default_prompt = (
                f"Scene: {slice_data['description']}. "
                f"Characters speak: {' / '.join(d['translated'] for d in slice_data['dialogue'])}"
            )
            s = Slice(
                id=slice_id,
                project_id=project_id,
                slice_index=slice_data["index"],
                time_start=slice_data["start"],
                time_end=slice_data["end"],
                original_description=slice_data["description"],
                original_dialogue=json.dumps(slice_data["dialogue"], ensure_ascii=False),
                prompt=default_prompt,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(s)

        project.status = "待确认"
        project.episode_count = 1
        project.updated_at = datetime.utcnow()
        db.commit()
        logger.info(f"[mock_ai] parsing complete for project={project_id}")

        await sse_manager.publish(
            project_id,
            "parsing_complete",
            {
                "project_id": project_id,
                "status": "待确认",
                "slice_count": len(MOCK_SLICES),
                "asset_count": len(MOCK_ASSETS),
            },
        )
    except Exception as e:
        logger.error(f"[mock_ai] simulate_parsing error: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


async def simulate_generation(task_id: str, sse_manager):
    """
    Simulate video generation for a single task:
    - Wait 2–4 seconds
    - 80% success: assign mock video URL + vbench score
    - 20% failure: set error message
    - Update slice status accordingly
    - Fire SSE event
    """
    logger.info(f"[mock_ai] simulate_generation started for task={task_id}")
    await asyncio.sleep(random.uniform(2, 4))

    db = SessionLocal()
    try:
        task = db.query(GenerationTask).filter(GenerationTask.id == task_id).first()
        if not task:
            logger.warning(f"[mock_ai] task {task_id} not found")
            return

        task.status = "generating"
        db.commit()

        await asyncio.sleep(random.uniform(1, 2))

        success = random.random() < 0.8

        if success:
            mock_video_url = f"https://mock-cdn.drama-factory.dev/videos/{task_id}.mp4"
            vbench_score = random.randint(70, 95)

            task.status = "completed"
            task.video_url = mock_video_url
            task.vbench_score = vbench_score

            # Update the parent slice
            slice_obj = db.query(Slice).filter(Slice.id == task.slice_id).first()
            if slice_obj:
                slice_obj.status = "completed"
                slice_obj.ai_video_url = mock_video_url
                slice_obj.vbench_score = vbench_score
                slice_obj.adopted_task_id = task_id
                slice_obj.error_message = None
                slice_obj.updated_at = datetime.utcnow()

            db.commit()
            logger.info(f"[mock_ai] task {task_id} completed (score={vbench_score})")

            await sse_manager.publish(
                task.project_id,
                "slice_completed",
                {
                    "task_id": task_id,
                    "slice_id": task.slice_id,
                    "project_id": task.project_id,
                    "status": "completed",
                    "video_url": mock_video_url,
                    "vbench_score": vbench_score,
                },
            )
        else:
            error_msg = "合规拦截：包含敏感内容"
            task.status = "failed"
            task.error_message = error_msg

            slice_obj = db.query(Slice).filter(Slice.id == task.slice_id).first()
            if slice_obj:
                slice_obj.status = "failed"
                slice_obj.error_message = error_msg
                slice_obj.updated_at = datetime.utcnow()

            db.commit()
            logger.info(f"[mock_ai] task {task_id} failed")

            await sse_manager.publish(
                task.project_id,
                "slice_failed",
                {
                    "task_id": task_id,
                    "slice_id": task.slice_id,
                    "project_id": task.project_id,
                    "status": "failed",
                    "error_message": error_msg,
                },
            )

        # After each task, check overall project status
        await _update_project_status(task.project_id, db, sse_manager)

    except Exception as e:
        logger.error(f"[mock_ai] simulate_generation error: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


async def _update_project_status(project_id: str, db, sse_manager):
    """Check all slices and update project status to 已完成 or 部分失败."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    slices = db.query(Slice).filter(Slice.project_id == project_id).all()
    if not slices:
        return

    statuses = [s.status for s in slices]
    total = len(statuses)
    completed = statuses.count("completed")
    failed = statuses.count("failed")
    in_progress = statuses.count("generating") + statuses.count("pending")

    if in_progress > 0:
        return  # Still generating

    if failed == 0:
        new_status = "已完成"
    elif completed == 0:
        new_status = "部分失败"
    else:
        new_status = "部分失败"

    if project.status != new_status:
        project.status = new_status
        project.updated_at = datetime.utcnow()
        db.commit()

        await sse_manager.publish(
            project_id,
            "project_status_changed",
            {
                "project_id": project_id,
                "status": new_status,
                "total": total,
                "completed": completed,
                "failed": failed,
            },
        )
