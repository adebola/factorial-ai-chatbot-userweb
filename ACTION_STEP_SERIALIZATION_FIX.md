# Action Step Serialization Fix

## Problem

When saving a workflow with an ACTION step, the frontend was generating incorrect JSON that caused a **422 error** from the backend.

### Incorrect JSON (Frontend was sending):
```json
{
  "id": "step_xt95d2yn1",
  "type": "action",
  "name": "send_info",
  "content": "",
  "condition": "",
  "options": [],
  "variable": "",
  "action": {
    "type": "send_email",
    "params": {
      "to": "{{email}}",
      "subject": "Subject",
      "body": "The company size is {{company_size}}"
    }
  }
}
```

### Correct JSON (Backend expects):
```json
{
  "id": "step_xt95d2yn1",
  "type": "action",
  "name": "send_info",
  "action": "send_email",
  "params": {
    "to": "{{email}}",
    "subject": "Subject",
    "body": "The company size is {{company_size}}"
  },
  "next_step": "next_step_id_or_null"
}
```

## Root Cause

The frontend uses a **nested FormGroup structure** for the UI (makes it easier to manage action types and parameters dynamically), but the backend expects a **flat structure**.

### UI Form Structure (Nested):
```typescript
action: FormGroup {
  type: FormControl('send_email'),
  params: FormGroup {
    to: FormControl('{{email}}'),
    subject: FormControl('Subject'),
    body: FormControl('...')
  }
}
```

### Backend Schema (Flat):
```typescript
{
  action: string,  // "send_email"
  params: object   // { to, subject, body }
}
```

The serialization logic was directly mapping form values without transforming the nested structure.

## Solution

Implemented **bidirectional transformation** between frontend (nested) and backend (flat) formats:

### 1. Save: Transform Nested → Flat

**File**: `workflow-create.component.ts`
**Method**: `buildWorkflowJson()` (lines 325-353)

```typescript
const steps = formValue.steps.map((step: any) => {
  // For ACTION steps, flatten the nested structure
  if (step.type === StepType.ACTION && step.action && typeof step.action === 'object') {
    return {
      id: step.id,
      type: step.type,
      name: step.name,
      action: step.action.type,      // Extract type from nested object
      params: step.action.params,    // Extract params from nested object
      next_step: step.next_step,
      metadata: step.metadata
    };
  }

  // For other steps, use normal mapping
  return {
    id: step.id,
    type: step.type,
    name: step.name,
    content: step.content,
    condition: step.condition,
    options: step.options,
    variable: step.variable,
    action: step.action,
    params: step.params,
    next_step: step.next_step,
    metadata: step.metadata
  };
});
```

**What it does:**
- Detects ACTION steps with nested action object
- Extracts `action.type` → flattens to `action` string
- Extracts `action.params` → flattens to `params` object
- Removes unnecessary fields (content, condition, options, variable)

### 2. Load: Transform Flat → Nested

**File**: `workflow-create.component.ts`
**Method**: `addStep()` (lines 216-225)

```typescript
// For ACTION steps from backend, transform flat structure to nested for form
let actionValue: any = stepData?.action || '';
if (stepData?.type === StepType.ACTION && typeof stepData.action === 'string') {
  // Backend has flat structure: { action: "send_email", params: {...} }
  // Convert to nested for form: { action: { type: "send_email", params: {...} } }
  actionValue = {
    type: stepData.action,
    params: stepData.params || {}
  };
}

const step = this.fb.group({
  // ... other fields
  action: [actionValue],
  // ...
});
```

**What it does:**
- Detects ACTION steps from backend (action is a string)
- Wraps flat structure into nested object
- Sets `action.type` from backend `action` string
- Sets `action.params` from backend `params` object

## Data Flow

### Creating a Workflow

1. **User selects ACTION step** → UI shows action type dropdown
2. **User selects "Send Email"** → UI shows email parameters (to, subject, body)
3. **User fills parameters** → Stored in nested FormGroup
4. **User saves workflow** → `buildWorkflowJson()` flattens structure
5. **Frontend sends** → Flat JSON to backend ✅
6. **Backend validates** → Accepts correct format ✅

### Loading a Workflow

1. **Backend returns workflow** → Flat ACTION step format
2. **Frontend receives** → `addStep()` transforms to nested
3. **Form populated** → Nested FormGroup structure
4. **UI displays** → Action dropdown shows "Send Email" ✅
5. **UI displays** → Parameters show correct values ✅

## Testing

### Test Case 1: Save Workflow with ACTION Step

**Input** (form values):
```json
{
  "action": {
    "type": "send_email",
    "params": {
      "to": "{{email}}",
      "subject": "Welcome!",
      "body": "Thank you for signing up!"
    }
  }
}
```

**Output** (sent to backend):
```json
{
  "action": "send_email",
  "params": {
    "to": "{{email}}",
    "subject": "Welcome!",
    "body": "Thank you for signing up!"
  }
}
```

✅ **Result**: Backend accepts, no 422 error

### Test Case 2: Load Workflow with ACTION Step

**Input** (from backend):
```json
{
  "action": "webhook",
  "params": {
    "url": "https://api.example.com/notify",
    "method": "POST",
    "headers": "{}",
    "body": "{\"message\": \"{{message}}\"}"
  }
}
```

**Output** (form values):
```json
{
  "action": {
    "type": "webhook",
    "params": {
      "url": "https://api.example.com/notify",
      "method": "POST",
      "headers": "{}",
      "body": "{\"message\": \"{{message}}\"}"
    }
  }
}
```

✅ **Result**: UI displays action type and parameters correctly

## Supported Action Types

All 6 action types now serialize correctly:

| Action Type | Backend String | Parameters |
|------------|---------------|------------|
| Send Email | `"send_email"` | to, subject, body |
| Webhook | `"webhook"` | url, method, headers, body |
| Database | `"database"` | operation, table, data |
| API Call | `"api_call"` | url, method, headers, params |
| Set Variable | `"set_variable"` | variable, value |
| Log | `"log"` | level, message |

## Files Modified

### `workflow-create.component.ts`

**Lines 325-353**: Updated `buildWorkflowJson()`
- Added ACTION step detection
- Flatten nested structure before sending to backend
- Remove unnecessary fields for ACTION steps

**Lines 216-225**: Updated `addStep()`
- Added ACTION step detection
- Convert flat backend structure to nested form structure
- Preserve params for UI display

## Edge Cases Handled

1. **New ACTION step** (no backend data):
   - Form starts with nested structure ✅
   - Serializes correctly ✅

2. **Existing ACTION step** (from backend):
   - Transforms flat → nested for form ✅
   - Displays correctly in UI ✅
   - Re-saves as flat structure ✅

3. **Switching action type**:
   - Parameters update dynamically ✅
   - Serialization uses current type ✅

4. **Other step types** (MESSAGE, CHOICE, INPUT, CONDITION):
   - Not affected by ACTION transformation ✅
   - Continue to work as before ✅

## Benefits

✅ **No 422 errors** - Backend accepts ACTION steps
✅ **UI remains user-friendly** - Nested structure for easy management
✅ **Backend compatibility** - Flat structure as expected
✅ **Bidirectional sync** - Load and save work correctly
✅ **All action types supported** - 6 different action types work

## Before vs After

### Before (Broken)
```
Frontend Form → Direct Mapping → Backend
{action: {type, params}} → {action: {type, params}} → ❌ 422 Error
```

### After (Fixed)
```
Frontend Form → Transform → Backend
{action: {type, params}} → {action: type, params: params} → ✅ Accepted
```

---

**Status**: Fixed and tested ✅
**Build**: Successful ✅
**Backend Compatibility**: Verified ✅
