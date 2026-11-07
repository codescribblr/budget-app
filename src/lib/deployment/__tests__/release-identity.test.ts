import { describe, it, expect } from 'vitest';
import { isReleaseVersion, releaseHasChanged } from '../release-identity';
import { registerUnsavedChanges, hasUnsavedChanges } from '../unsaved-changes';
const current = {releaseId:'release-current',commitSha:'a'.repeat(40),buildTime:'2026-11-06T00:00:00Z',buildTimestamp:1000};
describe('immutable loaded release identity',()=>{
 it('detects an update on the first fetch without replacing the loaded identity',()=>{expect(releaseHasChanged('release-loaded',current)).toBe(true)});
 it('detects rollback even when its build timestamp is older',()=>{expect(releaseHasChanged(current.releaseId,{...current,releaseId:'release-previous',buildTimestamp:10})).toBe(true)});
 it('ignores unchanged identities and invalid fallback timestamps',()=>{expect(releaseHasChanged(current.releaseId,{...current,buildTimestamp:2000})).toBe(false);expect(isReleaseVersion({buildTimestamp:Date.now()})).toBe(false);expect(releaseHasChanged(undefined,current)).toBe(false)});
 it('keeps a refresh blocked until every dirty editor is clear',()=>{const a=registerUnsavedChanges(),b=registerUnsavedChanges();expect(hasUnsavedChanges()).toBe(true);a();expect(hasUnsavedChanges()).toBe(true);b();expect(hasUnsavedChanges()).toBe(false)});
});
