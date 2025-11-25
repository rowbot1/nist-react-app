# NIST Control Mapper - Feature Implementation Plan

## Executive Summary

This document outlines the implementation plan for enhancing the NIST Control Mapper application to become a comprehensive compliance management platform for security teams.

**Implementation Priority:**
1. Evidence File Upload (Foundation)
2. Risk Heat Map Dashboard (High Visibility)
3. AI Assessment Assistant (Differentiator)
4. Audit Trail / Change History (Enterprise)
5. Multi-Framework Mapping (Scale)

---

## Phase 1: Evidence File Upload

**Business Value:** Security teams need to attach evidence (screenshots, policies, configs) to prove compliance during audits.

### Database Schema Changes

```prisma
// Add to schema.prisma

model Evidence {
  id            String   @id @default(uuid())
  assessmentId  String
  assessment    Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  fileName      String
  originalName  String
  mimeType      String
  fileSize      Int
  storagePath   String   // Local path or S3 key
  storageType   String   @default("local") // "local" | "s3"

  description   String?
  uploadedBy    String
  uploadedAt    DateTime @default(now())

  @@index([assessmentId])
}

// Update Assessment model
model Assessment {
  // ... existing fields
  evidence      Evidence[]
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assessments/:id/evidence` | Upload evidence file |
| GET | `/api/assessments/:id/evidence` | List evidence for assessment |
| GET | `/api/evidence/:id/download` | Download evidence file |
| DELETE | `/api/evidence/:id` | Delete evidence file |

### Backend Implementation

**New Files:**
```
server/src/
├── services/
│   └── storage.service.ts      # File storage abstraction (local/S3)
├── routes/
│   └── evidence.routes.ts      # Evidence CRUD endpoints
├── middleware/
│   └── upload.middleware.ts    # Multer configuration
└── uploads/                    # Local storage directory
```

**Key Code - storage.service.ts:**
```typescript
import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export class StorageService {
  private config: StorageConfig;
  private s3Client?: S3Client;

  constructor(config: StorageConfig) {
    this.config = config;
    if (config.type === 's3') {
      this.s3Client = new S3Client({ region: config.s3Region });
    }
  }

  async upload(file: Express.Multer.File, key: string): Promise<string> {
    if (this.config.type === 's3') {
      await this.s3Client!.send(new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      return `s3://${this.config.s3Bucket}/${key}`;
    } else {
      const filePath = path.join(this.config.localPath!, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.buffer);
      return filePath;
    }
  }

  async download(key: string): Promise<Buffer> {
    if (this.config.type === 's3') {
      const response = await this.s3Client!.send(new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: key,
      }));
      return Buffer.from(await response.Body!.transformToByteArray());
    } else {
      return fs.readFile(key);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.config.type === 's3') {
      // S3 delete implementation
    } else {
      await fs.unlink(key);
    }
  }
}
```

### Frontend Implementation

**New Files:**
```
client/src/
├── components/
│   ├── EvidenceUpload.tsx      # Drag-drop upload component
│   ├── EvidenceList.tsx        # List attached evidence
│   └── EvidenceViewer.tsx      # Preview/download evidence
├── hooks/
│   └── useEvidence.ts          # Evidence API hooks
└── types/
    └── evidence.types.ts       # TypeScript interfaces
```

**Key Component - EvidenceUpload.tsx:**
```typescript
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, LinearProgress, List, ListItem } from '@mui/material';
import { CloudUpload, InsertDriveFile } from '@mui/icons-material';
import { useUploadEvidence } from '../hooks/useEvidence';

interface EvidenceUploadProps {
  assessmentId: string;
  onUploadComplete?: () => void;
}

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  assessmentId,
  onUploadComplete,
}) => {
  const uploadMutation = useUploadEvidence(assessmentId);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      uploadMutation.mutate(file, {
        onSuccess: () => onUploadComplete?.(),
      });
    });
  }, [uploadMutation, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'text/plain': ['.txt', '.log'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.300',
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        bgcolor: isDragActive ? 'action.hover' : 'background.paper',
        transition: 'all 0.2s',
      }}
    >
      <input {...getInputProps()} />
      <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
      <Typography variant="body1">
        {isDragActive
          ? 'Drop files here...'
          : 'Drag & drop evidence files, or click to select'}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Supported: Images, PDF, Word, Text (max 10MB)
      </Typography>
      {uploadMutation.isPending && (
        <LinearProgress sx={{ mt: 2 }} />
      )}
    </Box>
  );
};
```

### Dependencies to Add

```bash
# Backend
npm install multer @aws-sdk/client-s3 uuid

# Frontend
npm install react-dropzone
```

### Estimated Effort: 2-3 days

---

## Phase 2: Risk Heat Map Dashboard

**Business Value:** Executives need at-a-glance visibility into compliance posture across all products and controls.

### Database Changes

None required - uses existing assessment data with aggregation queries.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/heatmap` | Get risk heat map data |
| GET | `/api/analytics/heatmap/:productId` | Product-specific heat map |

### Backend Implementation

**New File - analytics.routes.ts (extension):**
```typescript
// GET /api/analytics/heatmap
router.get('/heatmap', async (req, res) => {
  const { groupBy = 'category' } = req.query; // 'function' | 'category' | 'product'

  const assessments = await prisma.assessment.findMany({
    include: {
      system: { include: { product: true } },
    },
  });

  // Group by function/category and calculate risk scores
  const heatmapData = calculateHeatmapData(assessments, groupBy);

  res.json({ heatmap: heatmapData });
});

function calculateHeatmapData(assessments, groupBy) {
  // Risk score calculation:
  // - NOT_ASSESSED: 0.5 (unknown = medium risk)
  // - NON_COMPLIANT: 1.0 (high risk)
  // - PARTIALLY_COMPLIANT: 0.6
  // - COMPLIANT: 0.0
  // - NOT_APPLICABLE: excluded

  // Returns array of { id, name, riskScore, totalControls, assessedCount, compliantCount }
}
```

### Frontend Implementation

**New Files:**
```
client/src/
├── components/
│   ├── RiskHeatMap.tsx         # Main heat map visualization
│   ├── HeatMapCell.tsx         # Individual cell with tooltip
│   └── HeatMapLegend.tsx       # Color legend
├── pages/
│   └── RiskDashboard.tsx       # New dashboard page
└── hooks/
    └── useHeatMap.ts           # Heat map data hooks
```

**Key Component - RiskHeatMap.tsx:**
```typescript
import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useHeatMapData } from '../hooks/useHeatMap';

interface HeatMapProps {
  productId?: string;
  groupBy: 'function' | 'category' | 'product';
}

const getRiskColor = (score: number): string => {
  if (score >= 0.8) return '#d32f2f'; // Red - Critical
  if (score >= 0.6) return '#f57c00'; // Orange - High
  if (score >= 0.4) return '#fbc02d'; // Yellow - Medium
  if (score >= 0.2) return '#388e3c'; // Green - Low
  return '#1976d2'; // Blue - Minimal
};

export const RiskHeatMap: React.FC<HeatMapProps> = ({ productId, groupBy }) => {
  const { data, isLoading } = useHeatMapData({ productId, groupBy });

  if (isLoading) return <CircularProgress />;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 1 }}>
      {data?.map((item) => (
        <Tooltip
          key={item.id}
          title={
            <Box>
              <Typography variant="subtitle2">{item.name}</Typography>
              <Typography variant="body2">Risk Score: {(item.riskScore * 100).toFixed(0)}%</Typography>
              <Typography variant="body2">Compliant: {item.compliantCount}/{item.totalControls}</Typography>
            </Box>
          }
        >
          <Box
            sx={{
              bgcolor: getRiskColor(item.riskScore),
              color: 'white',
              p: 2,
              borderRadius: 1,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { opacity: 0.9, transform: 'scale(1.02)' },
              transition: 'all 0.2s',
            }}
          >
            <Typography variant="subtitle2" noWrap>{item.name}</Typography>
            <Typography variant="h6">{(item.riskScore * 100).toFixed(0)}%</Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};
```

### Visualization Options

Consider adding:
- **Treemap view** - Size by number of controls, color by risk
- **Radar chart** - CSF functions as axes
- **Trend sparklines** - Risk over time per category

### Estimated Effort: 2 days

---

## Phase 3: AI Assessment Assistant

**Business Value:** Reduce assessment time by 70% with AI-powered suggestions based on control descriptions and implementation examples.

### Database Changes

```prisma
model AIAssessmentSuggestion {
  id              String   @id @default(uuid())
  assessmentId    String
  assessment      Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  suggestedStatus String   // Suggested compliance status
  confidence      Float    // 0-1 confidence score
  reasoning       String   // AI explanation
  suggestedNotes  String?  // Suggested assessment notes

  accepted        Boolean  @default(false)
  dismissed       Boolean  @default(false)

  createdAt       DateTime @default(now())

  @@index([assessmentId])
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/suggest` | Get AI suggestion for assessment |
| POST | `/api/ai/bulk-suggest` | Bulk suggestions for product |
| POST | `/api/ai/analyze-evidence` | Analyze uploaded evidence |
| PUT | `/api/ai/suggestions/:id/accept` | Accept suggestion |
| PUT | `/api/ai/suggestions/:id/dismiss` | Dismiss suggestion |

### Backend Implementation

**New Files:**
```
server/src/
├── services/
│   └── ai.service.ts           # AI/LLM integration
├── routes/
│   └── ai.routes.ts            # AI endpoints
└── prompts/
    ├── assessment-suggest.txt  # Prompt template
    └── evidence-analyze.txt    # Evidence analysis prompt
```

**Key Code - ai.service.ts:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface AssessmentContext {
  controlId: string;
  controlTitle: string;
  controlDescription: string;
  implementationExamples: string[];
  systemContext: {
    name: string;
    environment: string;
    criticality: string;
    dataClassification: string;
  };
  existingNotes?: string;
  existingEvidence?: string[];
}

export async function suggestAssessment(context: AssessmentContext): Promise<{
  status: string;
  confidence: number;
  reasoning: string;
  suggestedNotes: string;
}> {
  const prompt = `You are a cybersecurity compliance expert helping assess NIST CSF 2.0 controls.

CONTROL: ${context.controlId} - ${context.controlTitle}
DESCRIPTION: ${context.controlDescription}

IMPLEMENTATION EXAMPLES:
${context.implementationExamples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

SYSTEM CONTEXT:
- System: ${context.systemContext.name}
- Environment: ${context.systemContext.environment}
- Criticality: ${context.systemContext.criticality}
- Data Classification: ${context.systemContext.dataClassification}

${context.existingNotes ? `EXISTING NOTES: ${context.existingNotes}` : ''}
${context.existingEvidence?.length ? `ATTACHED EVIDENCE: ${context.existingEvidence.join(', ')}` : ''}

Based on the control requirements and system context, provide:
1. A suggested compliance status (Implemented, Partially Implemented, Not Implemented, Not Applicable)
2. A confidence score (0.0-1.0)
3. Brief reasoning for your suggestion
4. Suggested assessment notes that would help document this assessment

Respond in JSON format:
{
  "status": "...",
  "confidence": 0.0,
  "reasoning": "...",
  "suggestedNotes": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
  throw new Error('Unexpected response format');
}

export async function analyzeEvidence(
  evidenceDescription: string,
  controlContext: AssessmentContext
): Promise<{
  relevance: number;
  findings: string[];
  suggestedStatus: string;
}> {
  // Analyze evidence against control requirements
  // Return relevance score and findings
}
```

### Frontend Implementation

**New Files:**
```
client/src/
├── components/
│   ├── AIAssistant.tsx         # AI suggestion panel
│   ├── AISuggestionCard.tsx    # Individual suggestion display
│   └── AIConfidenceBadge.tsx   # Confidence indicator
└── hooks/
    └── useAISuggestions.ts     # AI API hooks
```

**Key Component - AIAssistant.tsx:**
```typescript
import React from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  LinearProgress, Alert, Stack,
} from '@mui/material';
import { AutoAwesome, Check, Close } from '@mui/icons-material';
import { useAISuggestion, useAcceptSuggestion } from '../hooks/useAISuggestions';

interface AIAssistantProps {
  assessmentId: string;
  controlId: string;
  onAccept: (suggestion: AISuggestion) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  assessmentId,
  controlId,
  onAccept,
}) => {
  const { data: suggestion, isLoading, refetch } = useAISuggestion(assessmentId);
  const acceptMutation = useAcceptSuggestion();

  const handleAccept = () => {
    acceptMutation.mutate(suggestion!.id, {
      onSuccess: () => onAccept(suggestion!),
    });
  };

  if (isLoading) {
    return (
      <Card sx={{ bgcolor: 'primary.50' }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <AutoAwesome color="primary" />
            <Typography variant="subtitle1">AI Assistant Analyzing...</Typography>
          </Stack>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!suggestion) {
    return (
      <Button
        startIcon={<AutoAwesome />}
        onClick={() => refetch()}
        variant="outlined"
      >
        Get AI Suggestion
      </Button>
    );
  }

  return (
    <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesome color="primary" />
            <Typography variant="subtitle1">AI Suggestion</Typography>
          </Stack>
          <Chip
            label={`${(suggestion.confidence * 100).toFixed(0)}% confident`}
            size="small"
            color={suggestion.confidence > 0.8 ? 'success' : suggestion.confidence > 0.5 ? 'warning' : 'default'}
          />
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Suggested Status:</strong> {suggestion.suggestedStatus}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" mb={2}>
          {suggestion.reasoning}
        </Typography>

        {suggestion.suggestedNotes && (
          <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderRadius: 1, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">Suggested Notes:</Typography>
            <Typography variant="body2">{suggestion.suggestedNotes}</Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Check />}
            onClick={handleAccept}
          >
            Accept
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Close />}
            onClick={() => {/* dismiss */}}
          >
            Dismiss
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
```

### Dependencies to Add

```bash
# Backend
npm install @anthropic-ai/sdk
```

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514
AI_ENABLED=true
```

### Estimated Effort: 3-4 days

---

## Phase 4: Audit Trail / Change History

**Business Value:** Compliance requires demonstrating who changed what and when. Essential for SOC 2 and ISO 27001 audits.

### Database Changes

```prisma
model AuditLog {
  id          String   @id @default(uuid())

  // What changed
  entityType  String   // 'assessment' | 'product' | 'system' | 'evidence'
  entityId    String
  action      String   // 'create' | 'update' | 'delete'

  // Change details
  previousValue Json?  // Snapshot before change
  newValue      Json?  // Snapshot after change
  changedFields String[] // List of changed field names

  // Who and when
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}
```

### Implementation Approach

Use Prisma middleware to automatically log all changes:

```typescript
// server/src/middleware/audit.middleware.ts
import { Prisma } from '@prisma/client';

const AUDITED_MODELS = ['Assessment', 'Product', 'System', 'Evidence'];

export function auditMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    if (!AUDITED_MODELS.includes(params.model || '')) {
      return next(params);
    }

    const before = params.action === 'update' || params.action === 'delete'
      ? await prisma[params.model!].findUnique({ where: params.args.where })
      : null;

    const result = await next(params);

    if (['create', 'update', 'delete'].includes(params.action)) {
      await prisma.auditLog.create({
        data: {
          entityType: params.model!.toLowerCase(),
          entityId: result?.id || params.args.where?.id,
          action: params.action,
          previousValue: before,
          newValue: params.action !== 'delete' ? result : null,
          changedFields: getChangedFields(before, result),
          userId: getCurrentUserId(), // From request context
        },
      });
    }

    return result;
  };
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit` | List audit logs with filters |
| GET | `/api/audit/:entityType/:entityId` | History for specific entity |
| GET | `/api/audit/export` | Export audit trail as CSV |

### Estimated Effort: 2 days

---

## Phase 5: Multi-Framework Mapping

**Business Value:** Most organizations need to comply with multiple frameworks. Mapping controls reduces duplicate effort.

### Database Changes

```prisma
model Framework {
  id          String   @id @default(uuid())
  code        String   @unique // 'ISO27001', 'SOC2', 'PCIDSS', 'HIPAA'
  name        String
  version     String
  description String?

  controls    FrameworkControl[]
  mappings    CSFFrameworkMapping[]
}

model FrameworkControl {
  id          String    @id @default(uuid())
  frameworkId String
  framework   Framework @relation(fields: [frameworkId], references: [id])

  controlId   String    // e.g., 'A.5.1.1' for ISO, 'CC1.1' for SOC2
  title       String
  description String?
  category    String?

  mappings    CSFFrameworkMapping[]

  @@unique([frameworkId, controlId])
}

model CSFFrameworkMapping {
  id                  String           @id @default(uuid())
  csfSubcategoryId    String           // e.g., 'GV.OC-01'
  frameworkId         String
  framework           Framework        @relation(fields: [frameworkId], references: [id])
  frameworkControlId  String
  frameworkControl    FrameworkControl @relation(fields: [frameworkControlId], references: [id])

  mappingStrength     String           // 'direct' | 'partial' | 'related'
  notes               String?

  @@unique([csfSubcategoryId, frameworkControlId])
}
```

### Seed Data

Pre-populate with official NIST mappings:
- CSF → ISO 27001:2022
- CSF → NIST 800-53 Rev 5 (already have some)
- CSF → SOC 2 TSC
- CSF → PCI DSS 4.0
- CSF → HIPAA Security Rule

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/frameworks` | List available frameworks |
| GET | `/api/frameworks/:id/controls` | Controls for framework |
| GET | `/api/mappings/csf/:subcategoryId` | All framework mappings for CSF control |
| GET | `/api/mappings/crosswalk` | Full crosswalk matrix |

### Frontend: Crosswalk Matrix View

Show side-by-side comparison of compliance status across frameworks based on CSF assessments.

### Estimated Effort: 4-5 days (including data entry)

---

## Implementation Timeline (Suggested Phases)

```
Week 1-2:  Phase 1 - Evidence File Upload
Week 2-3:  Phase 2 - Risk Heat Map Dashboard
Week 3-4:  Phase 3 - AI Assessment Assistant
Week 4-5:  Phase 4 - Audit Trail
Week 5-7:  Phase 5 - Multi-Framework Mapping
```

---

## Additional Improvements (Quick Wins)

### 1. Assessment Workflow States
Add `status` field to Assessment: `draft` → `in_review` → `approved`

### 2. Scheduled Assessments
Add `nextAssessmentDate` and `assessmentFrequency` to Product/System

### 3. Bulk Import
CSV/Excel upload for initial assessment data

### 4. Dark Mode
Already have theming infrastructure - just add toggle

### 5. Keyboard Shortcuts
`j/k` navigation, `s` to save, `n` for next control

---

## File Structure After All Phases

```
client/src/
├── components/
│   ├── evidence/
│   │   ├── EvidenceUpload.tsx
│   │   ├── EvidenceList.tsx
│   │   └── EvidenceViewer.tsx
│   ├── heatmap/
│   │   ├── RiskHeatMap.tsx
│   │   ├── HeatMapCell.tsx
│   │   └── HeatMapLegend.tsx
│   ├── ai/
│   │   ├── AIAssistant.tsx
│   │   ├── AISuggestionCard.tsx
│   │   └── AIConfidenceBadge.tsx
│   └── audit/
│       ├── AuditTimeline.tsx
│       └── ChangeDetails.tsx
├── pages/
│   └── RiskDashboard.tsx
└── hooks/
    ├── useEvidence.ts
    ├── useHeatMap.ts
    ├── useAISuggestions.ts
    └── useAuditLog.ts

server/src/
├── services/
│   ├── storage.service.ts
│   └── ai.service.ts
├── routes/
│   ├── evidence.routes.ts
│   ├── ai.routes.ts
│   └── audit.routes.ts
├── middleware/
│   ├── upload.middleware.ts
│   └── audit.middleware.ts
└── prompts/
    ├── assessment-suggest.txt
    └── evidence-analyze.txt
```

---

## Dependencies Summary

```bash
# Backend additions
npm install multer @aws-sdk/client-s3 uuid @anthropic-ai/sdk

# Frontend additions
npm install react-dropzone
```

---

## Next Steps

1. **Review this plan** - Confirm priorities and scope
2. **Start Phase 1** - Evidence Upload is foundational
3. **Iterate** - Each phase builds on previous work
4. **User feedback** - Validate features with real users after each phase

---

*Generated: 2025-11-25*
*For: NIST Control Mapper Application*
