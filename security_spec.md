# Security Specification: MeterFlow

## Data Invariants
- A reading cannot exist without a valid value (positive number).
- A reading must be associated with a user UID.
- A user can only see and manage their own readings.
- Units are calculated based on the difference between the current and previous reading values.
- `createdAt` is immutable and managed by the server.

## The "Dirty Dozen" Payloads (Attacks)
1. **Identity Spoofing**: Attempt to create a reading with someone else's `userId`.
2. **Reading Value Injection**: Attempt to set a negative `readingValue`.
3. **Ghost Field Injection**: Attempt to add unauthorized fields like `isAdmin: true` to a reading.
4. **Timestamp Manipulation**: Attempt to set a past or future `createdAt` time.
5. **Collection Scraping**: Attempt to list readings without a `where` clause for `userId`.
6. **Cross-User Retrieval**: Attempt to `get` a specific reading ID belonging to another user.
7. **Size Attack**: Attempt to send a massive `remarks` string (e.g., 2MB).
8. **ID Poisoning**: Attempt to use a 2KB garbage string as a document ID.
9. **Units Bypass**: Attempt to update `units` independently of a reading change (though rules allow update).
10. **State Corruption**: Attempt to change the `userId` of an existing reading.
11. **PII Leak**: (Not applicable here as we don't store emails in readings, but relevant for users collection if it existed).
12. **Unauthorized Deletion**: Another user trying to delete your reading.

## Compliance
- All writes are protected by `isValidReading` which uses `hasAll` and `size` checks.
- All updates are action-based using `affectedKeys().hasOnly()`.
- Identity is strictly enforced via `request.auth.uid`.
