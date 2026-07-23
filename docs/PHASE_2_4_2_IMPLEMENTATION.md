# Phase 2.4.2 – Follow-up Scheduling & Care Continuity

## Overview
Transform the Encounter Follow-up Foundation (Phase 2.4.1) into a complete operational workflow where a clinician's Follow-up recommendation becomes an operational care pathway handled by Reception and completed when the patient returns.

## Implementation Checklist

### Backend Core (Service Layer)
- [ ] 1.1 Enhance EncounterFollowUpService with scheduling integration
- [ ] 1.2 Add scheduleAppointment() - creates PatientSchedule + EncounterFollowUpAttempt
- [ ] 1.3 Add rescheduleAttempt() - reschedule missed/cancelled attempts
- [ ] 1.4 Add autoCompleteFollowUp() - auto-complete on patient return admission
- [ ] 1.5 Add listFollowUpsByStatus() - for reception queue views
- [ ] 1.6 Add findFollowUpBySchedule() - lookup by schedule_id
- [ ] 1.7 Add notification generation on key lifecycle events
- [ ] 1.8 Add enhanced timeline events with attempt/appointment references

### Backend Controller Layer
- [ ] 2.1 Add reception workflow endpoints
- [ ] 2.2 Add scheduling integration endpoint
- [ ] 2.3 Add auto-completion integration endpoint
- [ ] 2.4 Add notification status endpoints

### Backend Routes & Middleware
- [ ] 3.1 Add new routes for reception workflow
- [ ] 3.2 Register RBAC permissions for new endpoints

### Patient Portal Integration
- [ ] 4.1 Add follow-up data to patient dashboard
- [ ] 4.2 Add follow-up history endpoint for patient portal
- [ ] 4.3 Ensure portal displays clinical info (reason, instructions, priority, status)

### Automatic Care Continuity (Admission Hook)
- [ ] 5.1 Integrate with admission flow in PatientScheduleService
- [ ] 5.2 Auto-locate EncounterFollowUp when patient admitted with follow-up appointment
- [ ] 5.3 Auto-mark attempt ATTENDED
- [ ] 5.4 Auto-mark follow-up COMPLETED
- [ ] 5.5 Store completed_encounter_id
- [ ] 5.6 Emit timeline and audit events

### Notification Integration
- [ ] 6.1 Notification on follow-up scheduled
- [ ] 6.2 Notification on follow-up rescheduled
- [ ] 6.3 Notification on follow-up cancelled
- [ ] 6.4 Notification on follow-up completed
- [ ] 6.5 Notification on patient admitted through follow-up

### Timeline Enhancement
- [ ] 7.1 Add attempt_id to timeline events
- [ ] 7.2 Add appointment_id to follow-up timeline events
- [ ] 7.3 Enhanced event descriptions with attempt context

### Audit Enhancement
- [ ] 8.1 Audit business events only
- [ ] 8.2 Add audit for scheduling, rescheduling, auto-complete

### Frontend – Redux API
- [ ] 9.1 Create followUpApi.ts with all endpoints
- [ ] 9.2 Add follow-up types

### Frontend – Reception Workflow Pages
- [ ] 10.1 Create FollowUpManagementPage - main reception view
- [ ] 10.2 Create FollowUpQueue - status-based queues
- [ ] 10.3 Create ScheduleFollowUpDialog - schedule appointment
- [ ] 10.4 Create FollowUpHistoryPanel - full attempt history

### Frontend – Provider View
- [ ] 11.1 Add follow-up status to AppointmentWorkflowPanel
- [ ] 11.2 Add "Schedule Follow-up" button to GlobalWorkflowActions

### Frontend – Patient Portal
- [ ] 12.1 Add Follow-up section to patient dashboard
- [ ] 12.2 Display clinical reason, instructions, priority, status
- [ ] 12.3 Show "Awaiting scheduling" when no appointment

### Frontend – Routes
- [ ] 13.1 Add /follow-ups route for reception
- [ ] 13.2 Add /follow-ups/[id] route for detail view

### Tests
- [ ] 14.1 Add integration tests for scheduling workflow
- [ ] 14.2 Add tests for missed appointment flow
- [ ] 14.3 Add tests for auto-completion on admission
- [ ] 14.4 Add tests for timeline integrity
- [ ] 14.5 Add tests for audit integrity

### Verification
- [ ] 15.1 Run Scenario 1 – Doctor creates Follow-up → Reception schedules → Patient attends → Auto-completes
- [ ] 15.2 Run Scenario 2 – Missed → Reschedule → Attends → Completes
- [ ] 15.3 Run Scenario 3 – Cancel → Verify timeline and audit
- [ ] 15.4 Run Scenario 4 – Patient portal displays follow-up info