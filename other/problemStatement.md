# User Flow Matrix

This matrix maps out combinations of different user states, current system inputs, and previous data inputs. It is structured to help handle state variations and business logic validations within your period tracking data model.

## State Transitions Matrix

| User Type     | Current Input                        | Last Input        |
| :------------ | :----------------------------------- | :---------------- |
| New User      | start date only                      | *                 |
| New User      | without start date only current date | *                 |
| New User      | end date                             | *                 |
| Existing User | start date only                      | start date        |
| Existing User | start date only                      | current date      |
| Existing User | start date only                      | end date          |
| Existing User | without start date only current date | start date        |
| Existing User | without start date only current date | current date      |
| Existing User | without start date only current date | end date          |
| Existing User | end date                             | start date        |
| Existing User | end date                             | current date      |
| Existing User | end date                             | end date          |
| Existing User | start date only                      | before 7 days ago |
| Existing User | without start date only current date | before 7 days ago |
| Existing User | end date                             | before 7 days ago |

---

## Structural Breakdown

### 1. New User Scenarios

For a brand new user profile, historical constraints (`*`) apply universally since no previous cycle data exists:

- **Start Date Only:** Captures the initialization of a active cycle.
- **Current Date Only (Without Start Date):** Records an isolated event or log snapshot mapping to the current timestamp.
- **End Date Only:** Marks an isolated termination state (typically requires fallback logic to instantiate a matching start date).

### 2. Existing User Matrix

For returning users, behavior shifts dynamically depending on what state was tracked during their last transaction:

- **Sequential Workflows:** Moving from a recorded `start date`, `current date`, or `end date` directly to a subsequent input.
- **Time-Delayed Entries:** Tracks scenarios where the last interaction occurred **before 7 days ago**, indicating a gap in cycle logging that might require initializing a separate cycle period rather than extending the existing sequence.
