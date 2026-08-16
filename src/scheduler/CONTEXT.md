# Directory Context: `/src/scheduler`

## Purpose
The choice of the device that executes a task, and the choice of the device that executes a duplicated copy of that task.

## Key Exports & Entry Points
- `task_scheduler.ts`: `TaskScheduler.assign(task)` gives a task to one device.
- `validator_selector.ts`: `ValidatorSelector.chooseValidator(task, excludedAccountIds)` chooses the worker of a duplicated copy, and `ValidatorSelector.chooseArbiter(task, excludedAccountIds)` chooses the worker that settles a disagreement.

## Rules
- The scheduler chooses the device. A worker never selects the task it executes, otherwise every worker would pick the task type that happens to be the most profitable on its own hardware.
- A duplicated copy never goes to an account that already returned a result for the same task, so two accounts that try to confirm each other cannot decide when they meet.
- An ordinary duplicated copy goes to any worker, while the copy that settles a disagreement is drawn from the more trusted candidates. The draw stays random inside that group, because an arbiter that could be named in advance is an arbiter two colluding accounts can wait for. The trust arrives as a `WorkerTrustFn`, so this folder still never imports from `trust/`.
- The choice is drawn from the `RandomNumberFn` given at construction, so it stays unpredictable for a worker and reproducible for a simulation.
- The scheduler asks the `DeviceEligibilityFn` whether a device receives tasks right now, and never answers that question itself. It therefore stays ignorant of the reason a device is set aside, whether that reason is a suspension or anything added later. A task with no eligible device is not assigned, rather than forced onto a suspended worker.

## Background
- The assignment by the scheduler answers the arbitrage of section 12.7 of [the design note](../../docs/explanation/design_note.md), and the unpredictable choice of a validator answers the collusion of section 12.2. A preference for workers that appear unrelated is left for later.
