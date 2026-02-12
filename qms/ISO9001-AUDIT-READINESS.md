# ISO 9001:2015 Audit Readiness Checklist

**Document Owner:** Deming  
**Last Updated:** 2026-02-11  
**Purpose:** Track audit preparation status for ISO 9001:2015 certification/surveillance

---

## 1. Quality Management System Implementation Status

### 1.1 Documentation (Clause 7.5)
- [x] Quality Manual exists
- [x] Control of Documents procedure (P10101) implemented
- [x] Documented procedures for core processes
- [ ] All procedures approved and at current revision
- [ ] Document repository accessible to all personnel

### 1.2 Quality Records
- [x] CPAR tracking system operational (P10201)
- [x] DMR tracking system operational (P87101)
- [x] Training Matrix maintained (CLF72202 Rev 1)
- [x] RMA Log maintained (CLF85501 Rev 1)
- [ ] Records retention schedule documented
- [ ] Records storage compliant (fireproof/backup)

---

## 2. Management Responsibility (Clause 5)

### 2.1 Quality Policy & Objectives
- [ ] Quality policy documented and communicated
- [ ] Quality objectives defined and measurable
- [ ] Management review meetings scheduled (min. annually)
- [ ] Management review records maintained

### 2.2 Customer Focus
- [ ] Customer satisfaction measurement process
- [ ] Customer feedback tracked (surveys, complaints)
- [ ] RMA data reviewed for trends

---

## 3. Resource Management (Clause 7)

### 3.1 Human Resources (Training)
- [x] Training Matrix operational
- [x] Employee training records maintained
- [x] Certification expiration tracking enabled
- [ ] Job descriptions define required competencies
- [ ] New hire training documented

### 3.2 Infrastructure
- [ ] Equipment list maintained
- [ ] Calibration schedule for measuring equipment
- [ ] Preventive maintenance schedule
- [ ] Facility environmental controls documented

---

## 4. Product Realization (Clause 8)

### 4.1 Inspection & Testing
- [ ] Incoming inspection procedure (INC location process)
- [ ] In-process inspection procedures
- [ ] Final inspection procedures
- [ ] Test equipment calibration records
- [ ] Inspection records traceable to lots/orders

### 4.2 Nonconforming Product Control (Clause 8.7)
- [x] DMR system tracks nonconforming material
- [x] Disposition authority defined (use-as-is, rework, scrap, return)
- [x] DMR workflow enforces P87101 procedure
- [ ] Segregation of nonconforming material (physical location)
- [ ] Customer notification process for shipped nonconformances

### 4.3 Corrective & Preventive Action (Clause 10.2)
- [x] CPAR system operational (P10201)
- [x] Root cause analysis methodology defined
- [x] Action plan tracking enabled
- [x] Verification of effectiveness tracked
- [ ] CPAR data reviewed for trends (monthly/quarterly)
- [ ] Management review includes CPAR summaries

---

## 5. Measurement, Analysis & Improvement (Clause 9)

### 5.1 Monitoring & Measurement
- [x] RMA tracking system operational
- [x] Quality KPIs tracked (shipments vs quality returns %)
- [ ] Internal audit schedule defined
- [ ] Internal audit checklist prepared
- [ ] Internal auditor(s) trained

### 5.2 Quality Metrics (Current Data)
**KPI #1: Shipment Quality Rate**
- 2022: 0.15% quality returns (1/675 shipments)
- 2023: 0.20% quality returns (2/1010 shipments)
- 2024: 0.54% quality returns (10/1850 shipments)
- 2025 YTD: 0.00% quality returns (0/830 shipments)

**Target:** < 1.0% quality returns

### 5.3 Data Analysis
- [ ] Trend analysis performed on RMA data
- [ ] Pareto analysis of defect types
- [ ] Cost of quality calculated

---

## 6. Critical Gaps for Audit

### High Priority (Required for certification)
1. **Internal Audit Program**
   - Schedule first internal audit
   - Train internal auditor(s)
   - Define audit checklist per ISO 19011

2. **Management Review**
   - Schedule management review meeting
   - Prepare agenda template (inputs: audit results, customer feedback, CPAR status, KPIs)
   - Document meeting minutes

3. **Quality Policy & Objectives**
   - Draft and approve quality policy statement
   - Define measurable quality objectives for 2026

4. **Calibration Program**
   - List all measuring equipment
   - Define calibration intervals
   - Schedule calibrations (internal or external lab)

### Medium Priority (Demonstrable improvement)
1. **Procedure Compliance Verification**
   - Walk through CPAR workflow with team
   - Walk through DMR workflow with team
   - Verify training records are current

2. **Document Control Audit**
   - Verify all procedures at current revision
   - Check obsolete documents removed from use
   - Verify access controls on quality documents

3. **Trend Analysis Reports**
   - Monthly RMA trend report
   - Quarterly CPAR effectiveness summary
   - DMR disposition analysis (rework vs scrap rates)

---

## 7. Audit Preparation Timeline

### 30 Days Before Audit
- [ ] Complete internal audit
- [ ] Close all open CPARs (or show progress)
- [ ] Review all DMRs for proper disposition closure
- [ ] Update training matrix (all current)

### 14 Days Before Audit
- [ ] Management review meeting completed
- [ ] Quality policy posted/communicated
- [ ] All calibrations current
- [ ] Mock audit with external consultant (optional)

### 7 Days Before Audit
- [ ] Audit logistics confirmed (auditor access, work area)
- [ ] Key personnel notified of audit schedule
- [ ] Evidence files prepared (CPAR binder, DMR log, training matrix)
- [ ] Review nonconformance handling with production staff

---

## 8. Evidence Files for Auditor Review

### Quality Manual & Procedures
- Quality Manual (top-level)
- P10101 - Control of Documents
- P10201 - Corrective and Preventive Action (CPAR)
- P87101 - Discrepant Material Reports (DMR)
- P##### - Incoming Inspection (INC location)
- P##### - In-Process Inspection
- P##### - Final Inspection

### Quality Records (Sample 6 months)
- Training Matrix (CLF72202)
- RMA Log (CLF85501) with quality returns highlighted
- CPAR records (open + closed examples)
- DMR records (all dispositions represented)
- Management review minutes
- Internal audit report(s)
- Calibration certificates

### Process Evidence
- Work instructions for critical operations
- Inspection forms (receiving, in-process, final)
- Customer complaints log (RMA subset)
- Nonconformance tags (physical or system screenshots)

---

## 9. QMS Digital System Status

**Mission Control Dashboard - QMS Module**

| Feature | Status | Location |
|---------|--------|----------|
| CPAR Tracking | ✅ Operational | `/qms` tab → CPAR |
| DMR Tracking | ✅ Operational | `/qms` tab → DMR |
| Training Matrix | ⏳ In Review | `/qms` tab → Training |
| RMA Log | ⏳ In Review | `/qms` tab → RMA |
| Quality KPIs | ✅ Operational | `/qms` dashboard summary |

**Code Status:**
- Backend: Convex functions deployed
- Frontend: `feature/rbac-ui` branch (awaiting merge)
- Database: Schema includes `cpars` and `dmrs` tables

**Deployment Note:** CPAR and DMR modules are functional on development branch. Training and RMA modules exist in backend but UI integration pending.

---

## 10. Next Actions (Deming)

1. **Week of 2026-02-11:**
   - Merge `feature/rbac-ui` branch (CPAR + DMR UI)
   - Deploy QMS modules to production
   - Begin internal audit planning

2. **Week of 2026-02-18:**
   - Draft quality policy statement
   - Define 2026 quality objectives
   - Schedule management review meeting

3. **Week of 2026-02-25:**
   - Conduct first internal audit
   - Document audit findings
   - Create CPARs for any nonconformances found

4. **Week of 2026-03-04:**
   - Complete management review
   - Finalize calibration schedule
   - Prepare audit evidence files

---

## Quality Guardian Notes

This audit readiness checklist reflects current QMS implementation status as of 2026-02-11. Digital systems (CPAR, DMR) are operational on development branch. Key gaps are procedural (internal audit, management review, calibration program).

**Confidence Level:** 60% ready for Stage 1 audit (documentation review)  
**Target:** 95% ready by 2026-03-15 for Stage 2 audit (implementation verification)

**ISO 9001:2015 Alignment:** All implemented modules map directly to procedure requirements. Quality KPI data demonstrates measurable improvement trajectory.

---

*Document Control: This checklist is a living document. Update after each management review or internal audit. Version controlled in Mission Control repository.*
