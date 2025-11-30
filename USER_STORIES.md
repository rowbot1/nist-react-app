# NIST Control Mapper - User Stories

## Overview

This document defines the key personas and user stories for the NIST Control Mapper application. These stories describe what users expect to accomplish and help guide UX decisions.

---

## Organizational Hierarchy

```
Capability Centre (e.g., Ireland, England, Wales)
  └── Framework (Business Domain Portfolio)
        └── Product (Application/Service)
              └── System (Deployable Component)
```

---

## Personas

### 1. Capability Centre Lead (Ciara)
**Role:** Oversees all frameworks within a Capability Centre (e.g., Ireland)
**Goals:** Monitor compliance across all frameworks in their CC, identify problem areas, report to executive leadership
**Tech Level:** Semi-technical, understands frameworks conceptually
**Frequency:** Weekly reviews, monthly/quarterly reporting
**Key Views:** CC Dashboard, Framework comparison, Trend analysis

### 2. Framework Owner (Marcus)
**Role:** Responsible for a specific framework and all products within it
**Goals:** Ensure products meet compliance requirements, work with Security Specialists and Product Owners to address gaps
**Tech Level:** Semi-technical, understands NIST frameworks
**Frequency:** Weekly reviews, coordinates assessments
**Key Views:** Framework Dashboard, Product list, Gap analysis

### 3. Security Specialist (Sarah)
**Role:** Hands-on compliance assessor who works with Framework Owners
**Goals:** Conduct assessments, document findings, work with System/Product Owners to gather evidence and remediate issues
**Tech Level:** Technical, deep NIST framework expertise
**Frequency:** Daily use - this is their primary tool
**Key Views:** Assessment screens, Control details, Evidence management

### 4. System Owner / Product Owner (Alex)
**Role:** Owns a specific system or product, responsible for implementing controls
**Goals:** Understand what's required, provide evidence to Security Specialists, track their system's compliance
**Tech Level:** Technical but not security-focused
**Frequency:** As needed - works WITH Security Specialists rather than directly in the tool
**Note:** System Owners typically don't use this tool directly. They work with Security Specialists who use the tool on their behalf during assessment sessions.

---

## User Stories by Persona

---

## Ciara (Capability Centre Lead)

### Story CCL-1: View Capability Centre Dashboard
**As a** Capability Centre Lead,
**I want to** see compliance scores across all frameworks in my Capability Centre,
**So that** I can identify which frameworks need the most attention.

**Acceptance Criteria:**
- [ ] Dashboard shows my CC with aggregate compliance score
- [ ] I can see all frameworks within my CC with their individual scores
- [ ] Visual indicators show Red/Amber/Green status
- [ ] I can compare frameworks against each other
- [ ] I can drill down: CC → Framework → Products → Systems

---

### Story CCL-2: Compare Framework Performance
**As a** Capability Centre Lead,
**I want to** compare compliance performance across frameworks in my CC,
**So that** I can identify best practices and problem areas.

**Acceptance Criteria:**
- [ ] Side-by-side comparison of framework compliance scores
- [ ] I can see which CSF functions are strongest/weakest per framework
- [ ] Trend lines show improvement or decline over time
- [ ] I can identify frameworks that are falling behind

---

### Story CCL-3: Report to Executive Leadership
**As a** Capability Centre Lead,
**I want to** generate reports showing my CC's compliance posture,
**So that** I can report to executive leadership.

**Acceptance Criteria:**
- [ ] Export CC-level summary report
- [ ] Report includes all frameworks with scores and trends
- [ ] Highlights critical gaps requiring attention
- [ ] Professional formatting suitable for leadership review

---

## Marcus (Framework Owner)

### Story FO-1: View Framework Dashboard
**As a** Framework Owner,
**I want to** see compliance scores across all products in my framework,
**So that** I can identify which products need attention.

**Acceptance Criteria:**
- [ ] Dashboard shows my framework's overall compliance score
- [ ] I can see all products within my framework with their scores
- [ ] Visual indicators show Red/Amber/Green status
- [ ] I can drill down: Framework → Products → Systems
- [ ] I can see which Security Specialists are working on assessments

---

### Story FO-2: Identify Compliance Gaps
**As a** Framework Owner,
**I want to** see a list of all "Not Implemented" and "Partially Implemented" controls across my framework,
**So that** I can prioritize remediation efforts with Product/System Owners.

**Acceptance Criteria:**
- [ ] I can view a gap analysis report for my framework
- [ ] Gaps are sorted by risk level (Critical first)
- [ ] I can filter by Product or System
- [ ] Each gap shows: Control, System, Status, Risk Level, Owner
- [ ] I can export this list to CSV/Excel

---

### Story FO-3: Track Framework Compliance Trends
**As a** Framework Owner,
**I want to** see how my framework's compliance has changed over time,
**So that** I can demonstrate progress to the CC Lead.

**Acceptance Criteria:**
- [ ] A trend chart shows compliance score over time
- [ ] I can select different time ranges (30/60/90 days)
- [ ] I can see trends by Product within my framework
- [ ] The chart highlights when major changes occurred

---

### Story FO-4: Coordinate with Security Specialists
**As a** Framework Owner,
**I want to** see which assessments are in progress and who is working on them,
**So that** I can coordinate assessment activities.

**Acceptance Criteria:**
- [ ] I can see a list of in-progress assessments
- [ ] Each shows the Security Specialist assigned
- [ ] I can see assessment progress (e.g., "35 of 106 controls assessed")
- [ ] I can identify stalled or overdue assessments

---

### Story FO-5: Generate Framework Reports
**As a** Framework Owner,
**I want to** generate PDF/Excel reports of my framework's compliance posture,
**So that** I can share with auditors, CC Lead, and stakeholders.

**Acceptance Criteria:**
- [ ] I can generate a Framework Summary report
- [ ] I can generate a detailed Gap Analysis report
- [ ] I can generate Product-specific reports
- [ ] Reports include charts, scores, and control-level details

---

## Sarah (Security Specialist)

### Story SS-1: Assess a System Against NIST CSF Controls
**As a** Security Specialist,
**I want to** select a system and assess it against each applicable NIST CSF control,
**So that** I can document our current compliance posture.

**Acceptance Criteria:**
- [ ] I can navigate to a specific system
- [ ] I see all applicable controls for that system (based on product baseline)
- [ ] For each control, I can set a status: Not Assessed, Not Applicable, Not Implemented, Partially Implemented, Implemented
- [ ] I can add implementation notes explaining our current state
- [ ] I can add a risk level if not implemented (Low, Medium, High, Critical)
- [ ] I can upload evidence documents (screenshots, policies, configs)
- [ ] My name and the date are automatically recorded
- [ ] Changes are saved and the compliance score updates

---

### Story SS-2: Continue an In-Progress Assessment
**As a** Security Specialist,
**I want to** see where I left off in an assessment and continue from there,
**So that** I can efficiently complete assessments over multiple sessions.

**Acceptance Criteria:**
- [ ] I can see which controls are "Not Assessed" vs already assessed
- [ ] I can filter to show only "Not Assessed" controls
- [ ] The system remembers my last position/filter
- [ ] I can see my progress (e.g., "35 of 106 controls assessed")

---

### Story SS-3: Update an Existing Assessment
**As a** Security Specialist,
**I want to** update a previously assessed control when the implementation changes,
**So that** our compliance records stay current.

**Acceptance Criteria:**
- [ ] I can click on any assessed control to edit it
- [ ] I can change the status (e.g., "Partially Implemented" → "Implemented")
- [ ] I can add/update implementation notes
- [ ] I can add additional evidence
- [ ] The history shows the previous assessment and who changed it
- [ ] The compliance score updates automatically

---

### Story SS-4: View NIST 800-53 Mappings
**As a** Security Specialist,
**I want to** see which NIST 800-53 controls map to each CSF subcategory,
**So that** I can provide more detailed technical guidance to System Owners.

**Acceptance Criteria:**
- [ ] When viewing a CSF control, I can see mapped 800-53 controls
- [ ] I can see the 800-53 control family and priority level
- [ ] I can click through to see the full 800-53 control description

---

### Story SS-5: Bulk Update Assessments
**As a** Security Specialist,
**I want to** update multiple controls at once (e.g., mark all "Govern" controls as a batch),
**So that** I can efficiently assess controls that have the same status.

**Acceptance Criteria:**
- [ ] I can select multiple controls using checkboxes
- [ ] I can apply a status to all selected controls
- [ ] I can add the same notes to all selected controls
- [ ] A confirmation shows how many controls will be updated

---

### Story SS-6: Work with System Owner on Assessment
**As a** Security Specialist,
**I want to** record evidence and notes from conversations with System Owners,
**So that** assessments reflect accurate implementation status.

**Acceptance Criteria:**
- [ ] I can add notes from discussions with System Owners
- [ ] I can upload evidence provided by System Owners
- [ ] I can record who provided the evidence
- [ ] I can request additional evidence if needed

---

## Alex (System Owner / Product Owner)

> **Note:** System Owners typically work WITH Security Specialists rather than directly in the tool. These stories represent optional self-service capabilities or read-only views.

### Story SO-1: View My System's Compliance Status (Read-Only)
**As a** System Owner,
**I want to** see my system's compliance status,
**So that** I understand what security work the team needs to address.

**Acceptance Criteria:**
- [ ] I can navigate directly to my system (if given access)
- [ ] I see a clear compliance score and status
- [ ] I see which controls are not yet implemented
- [ ] Controls are explained in understandable terms (not just codes)
- [ ] I can see implementation examples/guidance

---

### Story SO-2: Understand What's Required
**As a** System Owner,
**I want to** understand what a control means and how to implement it,
**So that** I can work with my team to make the necessary changes.

**Acceptance Criteria:**
- [ ] Each control has a clear description
- [ ] Implementation examples are provided
- [ ] NIST 800-53 mappings show technical requirements
- [ ] Language is accessible to non-security professionals

---

## Cross-Cutting Stories

### Story CC-1: Search Across the Application
**As any** user,
**I want to** search for products, systems, or controls by name,
**So that** I can quickly navigate to what I need.

**Acceptance Criteria:**
- [ ] Global search (Cmd+K) searches across all entities
- [ ] Results show the type (Product, System, Control)
- [ ] Clicking a result navigates directly there
- [ ] Recent searches are remembered

---

### Story CC-2: Understand the Hierarchy
**As any** user,
**I want to** understand the organizational hierarchy (CC → Framework → Product → System),
**So that** I can navigate effectively and understand where things belong.

**Acceptance Criteria:**
- [ ] Breadcrumbs always show current location
- [ ] Sidebar navigation reflects the hierarchy
- [ ] I can easily move up/down the hierarchy
- [ ] The relationship between entities is clear

---

### Story CC-3: Configure Product Baseline
**As a** Compliance Manager or Security Analyst,
**I want to** configure which CSF controls apply to a product,
**So that** systems under that product are assessed against the right controls.

**Acceptance Criteria:**
- [ ] I can select which CSF subcategories apply to a product
- [ ] I can mark controls as "Must Have" vs "Should Have"
- [ ] The baseline propagates to all systems under the product
- [ ] I can see a summary of the baseline (e.g., "106 controls selected")

---

## Priority Matrix

| Priority | Story | Persona | Current Status |
|----------|-------|---------|----------------|
| P0 - Critical | SS-1 | Security Specialist | Partially implemented - needs edit capability |
| P0 - Critical | SS-3 | Security Specialist | Missing - no edit dialog |
| P0 - Critical | CC-3 | Framework Owner/Security Specialist | Exists but UX unclear |
| P1 - High | CCL-1 | Capability Centre Lead | Partially implemented (Frameworks page groups by CC) |
| P1 - High | FO-1 | Framework Owner | Partially implemented (Frameworks page) |
| P1 - High | SS-2 | Security Specialist | Missing - no progress tracking |
| P2 - Medium | FO-2 | Framework Owner | Partially exists (Analytics) |
| P2 - Medium | SS-4 | Security Specialist | Exists in control details |
| P2 - Medium | FO-5 | Framework Owner | Exists (Reports page) |
| P2 - Medium | CCL-3 | Capability Centre Lead | Partially exists (Reports page) |
| P3 - Lower | SS-5 | Security Specialist | Missing - no bulk edit |
| P3 - Lower | FO-4 | Framework Owner | Missing - no assessment coordination view |
| P3 - Lower | SO-1 | System Owner | Exists (System Details) - read-only is sufficient |

---

## Current UX Gaps Identified

Based on these user stories, the following gaps exist:

1. **Assessment Editing (SS-1, SS-3):** No clear way to edit an assessment from the System Details page. Security Specialists need to be able to click a control and update its status/notes/evidence.

2. **Context Switching (SS-1):** "View All Assessments" on System page goes to Product level, losing system context. Security Specialists should stay within the system they're assessing.

3. **Progress Tracking (SS-2):** No indication of assessment progress (e.g., "35 of 106 controls assessed") or ability to filter "Not Assessed" controls.

4. **Baseline Configuration (CC-3):** Product baseline setup exists but isn't discoverable or clearly explained.

5. **CC-Level Dashboard (CCL-1):** Frameworks page now groups by CC, but needs clearer CC-level metrics and comparison views.

6. **Framework Owner View (FO-1):** Need clearer framework-focused dashboard showing all products within the framework.

7. **Labels & Language:** Generic labels like "Compliance Assessments (40)" instead of contextual "Compliance Assessments for System Four".

---

## Workflow Summary

### Primary Workflow: Security Specialist Assessment
```
1. Framework Owner assigns Security Specialist to assess a Product/System
2. Security Specialist navigates: Framework → Product → System
3. Security Specialist works through controls with System Owner (meetings, evidence gathering)
4. Security Specialist updates control status, adds notes, uploads evidence
5. Compliance scores auto-update
6. Framework Owner reviews progress and reports to CC Lead
```

### Reporting Hierarchy
```
System Owner ──(works with)──> Security Specialist
                                      │
                                      ▼
                              Framework Owner
                                      │
                                      ▼
                           Capability Centre Lead
                                      │
                                      ▼
                           Executive Leadership
```

---

## Next Steps

1. Review these user stories with stakeholders
2. Prioritize which stories to implement/fix first
3. **P0 Priority:** Implement assessment editing capability (SS-1, SS-3)
4. **P0 Priority:** Fix "View All Assessments" to stay in system context
5. **P1 Priority:** Add progress tracking for assessments (SS-2)
6. Test with real Security Specialists

---

*Document created: 2025-11-28*
*Last updated: 2025-11-28*
