"""Router for scenario events and simulation."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
import logging

from database import get_db
from models import BudgetScenario, ScenarioEvent, ScenarioSnapshot
from schemas.scenario_event import (
    ScenarioEventCreate,
    ScenarioEventUpdate,
    ScenarioEventResponse,
)
from schemas.scenario_snapshot import ScenarioSnapshotResponse
from services.scenario_simulation_engine import ScenarioSimulationEngine
from auth.router import get_current_user
from models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("/{scenario_id}/events", response_model=ScenarioEventResponse)
def create_scenario_event(
    scenario_id: UUID,
    event_in: ScenarioEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new event for a scenario."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Create event
    event = ScenarioEvent(
        scenario_id=scenario_id,
        event_type=event_in.event_type,
        effective_date=event_in.effective_date,
        recurrence_rule=event_in.recurrence_rule,
        payload_json=event_in.payload_json,
        priority=event_in.priority,
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    logger.info(f"Created event {event.id} for scenario {scenario_id}")
    
    return event


@router.get("/{scenario_id}/events", response_model=List[ScenarioEventResponse])
def list_scenario_events(
    scenario_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all events for a scenario."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    events = db.query(ScenarioEvent).filter(
        ScenarioEvent.scenario_id == scenario_id
    ).order_by(ScenarioEvent.effective_date).all()
    
    return events


@router.put("/{scenario_id}/events/{event_id}", response_model=ScenarioEventResponse)
def update_scenario_event(
    scenario_id: UUID,
    event_id: UUID,
    event_update: ScenarioEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a scenario event."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    event = db.query(ScenarioEvent).filter(
        ScenarioEvent.id == event_id,
        ScenarioEvent.scenario_id == scenario_id,
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    # Update fields
    if event_update.event_type is not None:
        event.event_type = event_update.event_type
    if event_update.effective_date is not None:
        event.effective_date = event_update.effective_date
    if event_update.recurrence_rule is not None:
        event.recurrence_rule = event_update.recurrence_rule
    if event_update.payload_json is not None:
        event.payload_json = event_update.payload_json
    if event_update.priority is not None:
        event.priority = event_update.priority
    
    db.commit()
    db.refresh(event)
    
    logger.info(f"Updated event {event_id}")
    
    return event


@router.delete("/{scenario_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario_event(
    scenario_id: UUID,
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a scenario event."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    event = db.query(ScenarioEvent).filter(
        ScenarioEvent.id == event_id,
        ScenarioEvent.scenario_id == scenario_id,
    ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    
    db.delete(event)
    db.commit()
    
    logger.info(f"Deleted event {event_id}")
    
    return None


@router.post("/{scenario_id}/simulate", response_model=List[ScenarioSnapshotResponse])
def simulate_scenario(
    scenario_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run simulation for a scenario."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Run simulation
    engine = ScenarioSimulationEngine(db)
    snapshots = engine.simulate(scenario)
    
    logger.info(f"Simulated scenario {scenario_id}: {len(snapshots)} snapshots")
    
    return snapshots


@router.post("/{scenario_id}/compare")
def compare_scenarios(
    scenario_id: UUID,
    comparison_scenario_ids: List[UUID],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare current scenario with other scenarios."""
    
    # Verify base scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Verify all comparison scenarios are owned by user
    for comp_id in comparison_scenario_ids:
        comp_scenario = db.query(BudgetScenario).filter(
            BudgetScenario.id == comp_id,
            BudgetScenario.user_id == current_user.id,
        ).first()
        
        if not comp_scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Comparison scenario {comp_id} not found",
            )
    
    # Compare
    engine = ScenarioSimulationEngine(db)
    all_ids = [scenario_id] + comparison_scenario_ids
    comparison = engine.compare_scenarios([str(id) for id in all_ids])
    
    logger.info(f"Compared {len(all_ids)} scenarios")
    
    return comparison


@router.post("/{scenario_id}/feasibility")
def compute_feasibility(
    scenario_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute feasibility score for a scenario."""
    
    # Verify scenario ownership
    scenario = db.query(BudgetScenario).filter(
        BudgetScenario.id == scenario_id,
        BudgetScenario.user_id == current_user.id,
    ).first()
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found",
        )
    
    # Get snapshots (must have been simulated)
    snapshots = db.query(ScenarioSnapshot).filter(
        ScenarioSnapshot.scenario_id == scenario_id
    ).order_by(ScenarioSnapshot.month_index).all()
    
    if not snapshots:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scenario has not been simulated yet. Run /simulate first.",
        )
    
    return {
        "scenario_id": str(scenario_id),
        "feasibility_score": float(scenario.feasibility_score or 0),
    }
