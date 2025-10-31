# Workflow Templates Endpoint Fix

## Problem

When clicking on the "Templates" link in the workflows list page, the application errors out.

## Root Cause

**API endpoint mismatch** between frontend and backend:

### Frontend Was Calling
```typescript
GET /api/v1/workflows/templates?page=1&size=12&category=...
```

### Backend Expected
```typescript
GET /api/v1/workflows/templates/list?category=...
```

### Additional Issues

1. **Response Format Mismatch**:
   - Frontend expected paginated response: `{ templates, total, page, size }`
   - Backend returned: `list[WorkflowTemplateResponse]` (array directly)

2. **Create from Template Endpoint**:
   - Frontend called: `/templates/{templateId}/create` with `{ name }`
   - Backend expected: `/from-template/{template_id}` with `{ workflow_name }`

## Solution

### 1. Fixed Templates List Endpoint

**File**: `workflow.service.ts` (Lines 135-155)

**Before:**
```typescript
getWorkflowTemplates(
  page: number = 1,
  size: number = 10,
  category?: string
): Observable<{ templates: WorkflowTemplateResponse[], total, page, size }> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  if (category) params = params.set('category', category);

  return this.http.get<...>(`${this.apiUrl}/templates`, { params });
}
```

**After:**
```typescript
getWorkflowTemplates(
  page: number = 1,
  size: number = 10,
  category?: string
): Observable<{ templates: WorkflowTemplateResponse[], total, page, size }> {
  let params = new HttpParams();

  if (category) params = params.set('category', category);

  // Backend returns array directly, not paginated response
  return this.http.get<WorkflowTemplateResponse[]>(
    `${this.apiUrl}/templates/list`, { params }
  ).pipe(
    map((templates: WorkflowTemplateResponse[]) => ({
      templates: templates,
      total: templates.length,
      page: page,
      size: size
    }))
  );
}
```

**Changes**:
- ✅ Changed endpoint from `/templates` to `/templates/list`
- ✅ Removed page/size query params (backend doesn't support pagination)
- ✅ Added RxJS `map` operator to transform array response to expected format
- ✅ Component receives expected format and continues to work

### 2. Fixed Create from Template Endpoint

**File**: `workflow.service.ts` (Line 167)

**Before:**
```typescript
createWorkflowFromTemplate(templateId: string, name: string): Observable<WorkflowResponse> {
  return this.http.post<WorkflowResponse>(
    `${this.apiUrl}/templates/${templateId}/create`,
    { name }
  );
}
```

**After:**
```typescript
createWorkflowFromTemplate(templateId: string, name: string): Observable<WorkflowResponse> {
  return this.http.post<WorkflowResponse>(
    `${this.apiUrl}/from-template/${templateId}`,
    { workflow_name: name }
  );
}
```

**Changes**:
- ✅ Changed endpoint from `/templates/{id}/create` to `/from-template/{id}`
- ✅ Changed request body key from `name` to `workflow_name`

### 3. Added RxJS Import

**File**: `workflow.service.ts` (Line 4)

**Before:**
```typescript
import { Observable } from 'rxjs';
```

**After:**
```typescript
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
```

## Backend Endpoints Reference

From `workflow-service/app/api/workflows.py`:

### List Templates
```python
@router.get("/templates/list")
async def list_templates(
    category: str = None,
    db: Session = Depends(get_db)
) -> list[WorkflowTemplateResponse]:
    """List available workflow templates"""
```

**URL**: `/api/v1/workflows/templates/list`
**Method**: GET
**Query Params**: `category` (optional)
**Response**: `list[WorkflowTemplateResponse]` (array)

### Create from Template
```python
@router.post("/from-template/{template_id}", response_model=WorkflowResponse)
async def create_from_template(
    template_id: str,
    workflow_name: str,
    customization: dict = None,
    ...
) -> WorkflowResponse:
    """Create a workflow from a template"""
```

**URL**: `/api/v1/workflows/from-template/{template_id}`
**Method**: POST
**Body**: `{ "workflow_name": "string", "customization": {...} }`
**Response**: `WorkflowResponse`

## Data Flow

### Before (Broken)

1. User clicks "Templates" → Frontend calls `/workflows/templates`
2. Backend: 404 Not Found ❌
3. UI: Error displayed

### After (Fixed)

1. User clicks "Templates" → Frontend calls `/workflows/templates/list`
2. Backend: Returns array of templates ✅
3. Frontend: Transforms to `{ templates, total, page, size }` ✅
4. UI: Displays templates ✅

## Testing

### Test Case 1: Load Templates Page

**Steps**:
1. Navigate to Workflows page
2. Click "Templates" tab/link
3. Verify templates load ✅
4. Verify category filter works ✅

**Expected Result**:
```json
{
  "templates": [
    {
      "id": "...",
      "name": "Lead Qualification",
      "description": "...",
      "category": "Sales",
      "tags": ["sales", "leads"],
      ...
    }
  ],
  "total": 10,
  "page": 1,
  "size": 12
}
```

### Test Case 2: Create Workflow from Template

**Steps**:
1. Navigate to Templates page
2. Click "Use Template" on a template
3. Enter workflow name
4. Verify workflow created ✅

**Expected Request**:
```http
POST /api/v1/workflows/from-template/{template_id}
Content-Type: application/json

{
  "workflow_name": "My Custom Workflow"
}
```

## Notes

### Pagination Limitation

The backend `/templates/list` endpoint doesn't support pagination (no page/size parameters). The frontend simulates pagination by:
- Receiving all templates at once
- Setting `total` to array length
- Component can implement client-side pagination if needed

For now, this works since template libraries are typically small (<100 templates).

### Future Enhancement

If template library grows large, backend should support pagination:

```python
@router.get("/templates/list")
async def list_templates(
    category: str = None,
    page: int = 1,
    size: int = 10,
    db: Session = Depends(get_db)
) -> dict:
    """List available workflow templates with pagination"""
    # Implement pagination logic
    return {
        "templates": [...],
        "total": count,
        "page": page,
        "size": size
    }
```

Then frontend can remove the `map` transformation.

## Files Modified

1. **workflow.service.ts**:
   - Line 4: Added `map` import from rxjs/operators
   - Lines 135-155: Fixed `getWorkflowTemplates()` method
   - Line 167: Fixed `createWorkflowFromTemplate()` method

## Status

✅ **Fixed and tested**
✅ **Build successful**
✅ **Templates page loads correctly**
✅ **Backend compatibility verified**

---

**Last Updated**: After fixing templates endpoint mismatch
