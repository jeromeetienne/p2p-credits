# Reference: Scheduler

Who receives a task, who receives the duplicated copy, and who settles a disagreement. The scheduler chooses the device, so a worker never selects the task it executes.

Everything here comes from `src/scheduler/`.

## `TaskScheduler`

The assignment of tasks to devices.

### `new TaskScheduler(taskSchedulerOptions: TaskSchedulerOptions)`

`TaskSchedulerOptions` holds:

- `devices: Device[]` — every device able to execute a task.
- `randomNumberFn: RandomNumberFn` — the source of randomness.
- `isDeviceEligibleFn?: DeviceEligibilityFn` — says whether a device receives tasks right now. Every device receives tasks when this is left out.

The scheduler asks whether a device is eligible and never answers the question itself, so it stays ignorant of the reason a device is set aside, whether that reason is a suspension, a maintenance window, or anything added later.

### `assign(task: Task): TaskAssignment | undefined`

Assigns one task to one device drawn at random among the devices that receive tasks right now, leaving out every device of the account that requested the task. Returns `undefined` when no other account receives tasks at that moment, and throws when the scheduler was built with no device at all.

Two accounts are excluded rather than one, and for two different reasons. The account that requested the task is excluded because an account executing its own task is debited and paid the same amount, gains the trust of a confirmed worker for nothing, and satisfies the rule about contributing before consuming at no cost at all. Every ineligible device is excluded because the network stopped sending it tasks.

## `ValidatorSelector`

The choice of the worker that executes a duplicated copy of a task.

### `new ValidatorSelector(validatorSelectorOptions: ValidatorSelectorOptions)`

`ValidatorSelectorOptions` holds:

- `devices: Device[]`, `randomNumberFn: RandomNumberFn`, `isDeviceEligibleFn?: DeviceEligibilityFn` — as for the scheduler.
- `workerTrustFn?: WorkerTrustFn` — the trust of a worker, used when a third source of truth is needed. Every worker has no trust at all when this is left out.
- `trustedArbiterShare?: number` — the share of the candidates, ordered from the most trusted, an arbiter is drawn from. A value of 0.5 draws the arbiter at random among the more trusted half. The whole list is used when this is left out.

### `chooseValidator(task, excludedAccountIds): TaskAssignment | undefined`

Chooses one worker to execute a duplicated copy. The choice is random, and it never selects an account that already returned a result for the same task, nor the account that requested the task. Two accounts that try to confirm each other therefore cannot decide when they meet.

### `chooseArbiter(task, excludedAccountIds): TaskAssignment | undefined`

Chooses one worker to settle a disagreement, drawn at random among the more trusted candidates. The draw stays random inside that group, because an arbiter that could be named in advance is an arbiter two colluding accounts can wait for. At least one candidate is always kept, however small the share.

Both return `undefined` when every account is excluded or set aside, and both mark the assignment as a validation copy.

## Related

- [The context of `/src/scheduler`](../../src/scheduler/CONTEXT.md)
- Sections 12.2 and 12.7 of [the design note](../explanation/design_note.md), which are the collusion and the arbitrage these two classes answer.
