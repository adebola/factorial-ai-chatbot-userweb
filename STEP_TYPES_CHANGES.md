# Step Types Changes - Removal and Action Step Fix

## Summary of Changes

### 1. Removed Step Types (Temporary)

**SUB_WORKFLOW** and **DELAY** step types have been removed from the UI and will be restored in a future release.

### 2. Fixed Action Step

The ACTION step dropdown was not showing action types due to a form binding issue. This has been fixed.

---

## Removed Step Types

### Sub-Workflow Step (Temporarily Removed)

**Status**: Commented out, ready for future restoration

**Original Purpose**: Execute another workflow as a sub-process

**UI Location**:
- `workflow-create.component.ts` lines 60-61 (commented)

**Code Preserved**:
```typescript
// TODO: Restore these step types in future release
// { value: StepType.SUB_WORKFLOW, label: 'Sub-workflow', description: 'Execute another workflow', icon: 'account_tree' },
```

**Template Code** (lines 149-167 in workflow-step-editor.component.html):
```html
<!-- Sub-workflow Configuration (for Sub-workflow steps) -->
<div *ngIf="stepType === StepType.SUB_WORKFLOW" class="form-group">
  <label for="sub_workflow_id">Sub-workflow ID *</label>
  <input id="sub_workflow_id" type="text" formControlName="sub_workflow_id"
         placeholder="Enter workflow ID" class="form-input">

  <label for="params">Parameters (JSON)</label>
  <textarea id="params" formControlName="params"
            placeholder='{"key": "value"}' class="form-textarea" rows="3">
  </textarea>
</div>
```

**Backend Support**: ✅ Backend model supports this (StepType.SUB_WORKFLOW exists)

**To Restore**:
1. Uncomment lines 60-61 in `workflow-create.component.ts`
2. Template code already exists and will activate automatically
3. No additional code changes needed

---

### Delay Step (Temporarily Removed)

**Status**: Commented out, ready for future restoration

**Original Purpose**: Wait for a specified duration before continuing workflow

**UI Location**:
- `workflow-create.component.ts` line 62 (commented)

**Code Preserved**:
```typescript
// TODO: Restore these step types in future release
// { value: StepType.DELAY, label: 'Delay', description: 'Wait for specified time', icon: 'schedule' }
```

**Template Code** (lines 169-186 in workflow-step-editor.component.html):
```html
<!-- Delay Configuration (for Delay steps) -->
<div *ngIf="stepType === StepType.DELAY" formGroupName="delay" class="form-group">
  <label>Delay Duration *</label>
  <div class="delay-fields">
    <input type="number" formControlName="duration"
           placeholder="30" class="form-input delay-duration" min="1">
    <select formControlName="unit" class="form-select delay-unit">
      <option value="seconds">Seconds</option>
      <option value="minutes">Minutes</option>
      <option value="hours">Hours</option>
      <option value="days">Days</option>
    </select>
  </div>
</div>
```

**TypeScript Support** (lines 164-181 in workflow-step-editor.component.ts):
```typescript
// TODO: Restore this when DELAY step type is re-enabled
ensureDelayFields(): void {
  const existingDelay = this.formGroup.get('delay');

  if (!existingDelay || !(existingDelay instanceof FormGroup)) {
    if (existingDelay) {
      this.formGroup.removeControl('delay');
    }

    this.formGroup.addControl('delay', this.fb.group({
      duration: [30],
      unit: ['seconds']
    }));
  }
}

get delayGroup(): FormGroup {
  return this.formGroup.get('delay') as FormGroup;
}
```

**Backend Support**: ✅ Backend model supports this (StepType.DELAY exists)

**To Restore**:
1. Uncomment line 62 in `workflow-create.component.ts`
2. Uncomment line 72 in `onStepTypeChange()` (if you add the case back)
3. Template code already exists and will activate automatically
4. TypeScript helper methods already fixed and ready

---

## Action Step Fix

### Problem

When selecting an ACTION step, the action type dropdown appeared empty - no action types were available for selection.

### Root Cause

Same issue as the earlier condition step problem:

1. **Parent form** created `action` as a simple **FormControl (string)**
2. **Step editor template** expected `action` as a **FormGroup** with nested fields
3. **ensureActionFields()** method checked `if (!this.formGroup.get('action'))` which returned FALSE (because the simple control already existed)
4. The nested FormGroup was never created, so the dropdown had nothing to bind to

### Solution

Updated `ensureActionFields()` to **replace** the simple FormControl with a FormGroup:

**Before:**
```typescript
ensureActionFields(): void {
  if (!this.formGroup.get('action')) {
    this.formGroup.addControl('action', this.fb.group({
      type: ['send_email'],
      params: this.fb.group({})
    }));
  }
}
```

**After:**
```typescript
ensureActionFields(): void {
  const existingAction = this.formGroup.get('action');

  // If action exists as a simple control or doesn't exist as FormGroup, replace it
  if (!existingAction || !(existingAction instanceof FormGroup)) {
    // Remove the simple control if it exists
    if (existingAction) {
      this.formGroup.removeControl('action');
    }

    // Add the FormGroup structure
    this.formGroup.addControl('action', this.fb.group({
      type: ['send_email'],
      params: this.fb.group({})
    }));

    // Initialize params for default action type
    this.onActionTypeChange();
  }
}
```

### Result

✅ Action type dropdown now shows all available actions:
- Send Email
- Webhook
- Database
- API Call
- Set Variable
- Log

✅ Action parameters dynamically update based on selected action type
✅ Form properly serializes to backend format

---

## Current Available Step Types

After these changes, the workflow creation UI supports **5 step types**:

1. ✅ **MESSAGE** - Send a message to the user
2. ✅ **CHOICE** - Present options for user to select (with variable capture)
3. ✅ **INPUT** - Collect text input from user (with variable capture)
4. ✅ **CONDITION** - Branch flow based on logic
5. ✅ **ACTION** - Perform system action (now working correctly)

---

## Files Modified

### 1. `workflow-create.component.ts`
**Lines 54-63**: Commented out SUB_WORKFLOW and DELAY from stepTypes array
```typescript
stepTypes = [
  { value: StepType.MESSAGE, ... },
  { value: StepType.CHOICE, ... },
  { value: StepType.INPUT, ... },
  { value: StepType.CONDITION, ... },
  { value: StepType.ACTION, ... }
  // TODO: Restore these step types in future release
  // { value: StepType.SUB_WORKFLOW, ... },
  // { value: StepType.DELAY, ... }
];
```

### 2. `workflow-step-editor.component.ts`
**Lines 90-109**: Fixed `ensureActionFields()` to replace simple control with FormGroup
**Lines 164-181**: Updated `ensureDelayFields()` with same fix (for future use)

### 3. Template Files
**No changes needed** - All template code for SUB_WORKFLOW and DELAY remains in place, just inactive until step types are restored.

---

## Testing Checklist

- [x] Build successful
- [x] SUB_WORKFLOW removed from step type dropdown
- [x] DELAY removed from step type dropdown
- [x] ACTION step shows action types dropdown
- [x] ACTION step shows correct parameters for each action type
- [x] Can create workflows with all 5 remaining step types
- [x] Form serialization works correctly
- [x] Code preserved for future restoration

---

## Future Restoration Process

### To Re-enable SUB_WORKFLOW:

1. Open `workflow-create.component.ts`
2. Uncomment line 61:
   ```typescript
   { value: StepType.SUB_WORKFLOW, label: 'Sub-workflow', description: 'Execute another workflow', icon: 'account_tree' },
   ```
3. No other changes needed - template and backend support already in place

### To Re-enable DELAY:

1. Open `workflow-create.component.ts`
2. Uncomment line 62:
   ```typescript
   { value: StepType.DELAY, label: 'Delay', description: 'Wait for specified time', icon: 'schedule' }
   ```
3. Open `workflow-step-editor.component.ts`
4. Add DELAY case to `onStepTypeChange()` switch:
   ```typescript
   case StepType.DELAY:
     this.ensureDelayFields();
     break;
   ```
5. No other changes needed - template and helper methods already fixed

---

## Backend Compatibility

All changes maintain full compatibility with the backend:

- ✅ Backend supports all 7 step types (including SUB_WORKFLOW and DELAY)
- ✅ Workflows created with 5 step types serialize correctly
- ✅ When SUB_WORKFLOW and DELAY are restored, backend will handle them immediately
- ✅ No backend changes required for restoration

---

## Notes for Developers

1. **Don't delete the commented code** - It's preserved for easy restoration
2. **Don't remove SUB_WORKFLOW/DELAY template code** - It will auto-activate when step types are restored
3. **The ensureDelayFields() fix** is already in place for when DELAY is restored
4. **All TypeScript helpers** for removed step types remain functional
5. **Backend models** (StepType enum) still include all 7 types

---

**Last Updated**: After fixing action step dropdown and removing SUB_WORKFLOW/DELAY step types
**Status**: All changes tested and verified ✅
