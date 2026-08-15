# Credit Accounting for a Peer-to-Peer Inference Network

> This file is a copy of [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1), which stays the authoritative version. The implementation plan lives in [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).

## Design Note

## 1. Objective

The system allows a user to contribute computing resources — typically CPU/GPU — when they are not using them.

In exchange, their account accumulates credits.

Later, they can spend those credits to have their own tasks executed by the network.

The system therefore needs to solve three main problems:

1. **Determine the price of each task**
2. **Estimate the trustworthiness of each worker**
3. **Estimate the validity of a returned result**

These three dimensions should remain separate.

The accounting layer itself can then remain simple: a ledger of credits and debits.

---

# 2. Price of Each Task

## Problem

Not all tasks have the same computational cost.

A task might take:

- 200 ms on a very powerful GPU;
- 2 seconds on an average machine;
- 20 seconds on a slow machine.

The worker should therefore not be rewarded directly based on the **actual time spent by that worker**.

Otherwise, a slow machine would be artificially rewarded more than a fast machine for exactly the same amount of useful work.

## Proposed principle: normalized cost

Each task type receives a price defined using a reference environment.

Example:

- reference task: 10 seconds on the reference machine → **1 credit**
- task A: 30 seconds → **3 credits**
- task B: 5 seconds → **0.5 credit**

The price therefore represents a normalized amount of work, rather than the actual execution time measured on the worker.

## Reference benchmark

The system could use:

- one or more trusted reference machines;
- a fixed software environment;
- a set of reference tasks;
- multiple runs to smooth out measurement noise.

The price of a task would then be calculated as a ratio relative to the reference task.

Example:

```text
price(A) = reference_cost(A) / reference_cost(reference_task)
```

If task A requires three times as much work as the reference task:

```text
price(A) = 3 credits
```

## Recalibration

The benchmark will probably need to be recomputed whenever the following change:

- models;
- runtimes;
- kernels;
- precision formats;
- GPU families;
- task characteristics.

---

# 3. Worker Trust

Each worker has a **trust score** that is independent from their credit balance.

This score is not money.

It simply represents the estimated likelihood that a result produced by this worker is correct.

## New worker

A new worker has little or no history.

The system can therefore:

- verify a large proportion of their first results;
- gradually increase their trust when results are confirmed;
- reduce the verification frequency over time.

## Trusted worker

When a worker has produced many correct results:

- their trust increases;
- fewer tasks need to be verified;
- the network's validation cost decreases.

## Suspicious worker

When a result is invalid:

- trust decreases;
- verification frequency increases;
- some rewards may optionally remain provisional;
- the worker may be temporarily limited or blocked depending on policy.

## Account or device?

An important open question remains:

Should trust belong to:

- the **account**;
- the **device**;
- or both?

For example, if Alice has a highly trusted account and later adds a new unknown GPU, should that new device immediately inherit the full trust of the account?

Probably not entirely.

---

# 4. Result Validity

Validating every result would be too expensive.

If every task had to be executed twice, the network would lose a large part of its economic advantage.

Validation therefore needs to be **sampled and adaptive**.

## Validation through duplication

A small fraction of tasks are sent to multiple workers.

Example:

- Alice receives task A;
- Bob independently receives the same task A;
- the two results are compared.

If the results match:

- the task is considered valid;
- Alice's and Bob's trust may increase.

## Disagreement

If Alice and Bob return different results, we do not immediately know who is wrong.

A third source of truth is then required.

Examples:

- send the task to Charlie;
- compare against a highly trusted worker;
- use a reference machine;
- use majority voting if multiple copies exist.

## Adaptive validation

The validation rate can depend on worker trust.

Conceptual example:

```text
new worker       -> frequent validation
trusted worker   -> rare validation
recent error     -> very frequent validation
```

The objective is to make fraud expensive without doubling the network's computational cost.

---

# 5. Accounting

Once the price of a task is known, accounting becomes relatively simple.

Example:

```text
Alice executes task A
price(A) = 3 credits

=> Alice: +3 credits
```

When Alice uses the network:

```text
Alice requests task B
price(B) = 2 credits

=> Alice: -2 credits
```

The system therefore behaves like an internal virtual currency.

## Ledger

It would be preferable to keep an append-only ledger of movements:

```text
timestamp
account_id
task_id
type = credit | debit
amount
reason
validation_status
```

The balance can then be reconstructed from the ledger.

---

# 6. Timing of Payment

An important difficulty appears here.

Not every task will be validated.

The system must therefore decide when credits become final.

Several options are possible.

## Option A — immediate credit

The worker receives credits immediately.

If fraud is detected later, the credits are removed.

Advantage:

- very smooth user experience.

Disadvantage:

- an attacker may spend the credits before being detected.

## Option B — provisional credit

Credits appear immediately but remain temporarily non-spendable.

Advantage:

- better security.

Disadvantage:

- less fluid user experience.

## Option C — delayed settlement

Results are grouped and settled periodically.

Advantage:

- robust accounting.

Disadvantage:

- more latency.

This question should be tested in simulation.

---

# 7. Identity and Disposable Accounts

An attacker who gets caught may simply try to create a new account.

This is the classic **Sybil attack** problem.

An identity based purely on a cryptographic key is not enough: an attacker can generate as many new keys as they want.

Some form of cost or friction therefore needs to be introduced.

Possible mechanisms:

- Google sign-in;
- GitHub;
- verified email;
- phone number;
- minimum contribution before consumption;
- limited initial deficit;
- gradually earned trust.

The goal is not necessarily to prevent the creation of all new identities.

The main goal is to make large-scale creation of disposable accounts less profitable than honest behavior.

---

# 8. Contribution Before Consumption

A simple rule can significantly reduce abuse:

> A new account must contribute before it can consume a large amount of resources.

The system could optionally allow a very small initial deficit so that the user can test the service.

Example:

```text
initial balance: 0
allowed deficit: -1 credit maximum
```

Then:

```text
to continue consuming:
the account must contribute
```

This avoids the following scenario:

```text
create account
-> consume heavily
-> abandon account
```

---

# 9. Feasibility Simulation

Before implementing the real system, it would be useful to build a simulation.

The purpose is not to simulate the inference itself.

The simulation should model:

- workers;
- tasks;
- credits;
- trust;
- validations;
- fraud;
- identities;
- economic behavior.

## Worker types

The simulation could include:

### Honest worker

Almost always returns a correct result.

### Unstable worker

Occasionally produces errors because of:

- hardware;
- runtime issues;
- crashes;
- numerical problems.

### Malicious worker

Intentionally tries to receive credits without correctly performing the computation.

### Sybil attacker

Creates many accounts and devices.

---

# 10. Parameters to Simulate

## Validation rate

For example:

```text
1%
2%
5%
10%
20%
```

Measure:

- detected fraud;
- undetected fraud;
- additional network cost.

## Initial trust

Test:

- zero trust;
- low trust;
- medium trust.

Observe how long it takes for an honest worker to become trusted.

## Penalty

Test different policies:

- small trust reduction;
- strong trust reduction;
- trust reset;
- suspension;
- credit confiscation.

## Percentage of malicious workers

Test:

```text
0.1%
1%
5%
10%
20%
```

## Task pricing error

Pricing will never be perfectly accurate.

Test:

```text
±1%
±5%
±10%
±20%
±30%
```

and observe whether some tasks become artificially more profitable than others.

---

# 11. Metrics to Measure in the Simulation

Important metrics include:

## Security

- percentage of false results accepted;
- percentage of credits awarded fraudulently;
- average time before a cheater is detected;
- maximum loss caused by one account before it is blocked.

## Cost

- percentage of total compute used only for validation;
- average number of duplications per task;
- cost of the third computation when there is disagreement.

## Economics

- total amount of credits created;
- total amount of credits consumed;
- possible inflation in the system;
- concentration of credits across accounts.

## User experience

- time before a new worker becomes trusted;
- time before earned credits become spendable;
- risk that an honest worker is unfairly penalized.

---

# 12. Open Questions

## 12.1 Non-deterministic results

Two correct executions of the same task may sometimes produce slightly different results.

The system needs to define:

- exact comparison;
- numerical tolerance;
- normalized hash;
- similarity score;
- task-specific validation.

For AI inference, this may become particularly important.

## 12.2 Collusion

Two malicious accounts could try to validate each other.

The scheduler should therefore make duplicated validation tasks unpredictable.

It could select validators randomly and prefer workers that appear unrelated.

## 12.3 Account vs device

Should trust be represented as:

```text
trust(account)
```

or:

```text
trust(device)
```

or some combination:

```text
trust(account, device)
```

This decision directly affects attack resistance.

## 12.4 Final or provisional credits

The system must decide whether credits:

- are immediately spendable;
- become final after a delay;
- are settled in batches.

## 12.5 Penalties

What happens when a worker is clearly caught cheating?

Possibilities:

- loss of trust;
- loss of credits;
- temporary block;
- permanent block;
- very high verification rate.

## 12.6 Benchmarking

The system must determine:

- how many reference machines to use;
- how to select them;
- how to detect benchmark drift;
- how to handle multiple GPU architectures.

## 12.7 Imperfect pricing

Even with benchmarking, some tasks may run unusually efficiently on certain hardware.

The system should check for arbitrage opportunities such as:

```text
task X
=> unusually profitable on GPU Y
=> every worker tries to select X
```

The scheduler can reduce this problem by assigning tasks itself instead of allowing workers to choose them.

## 12.8 Initial deficit

Open question:

> Should a small deficit be allowed for a new account?

This greatly improves onboarding but slightly increases the abuse surface.

---

# 13. Minimal Architecture

A first version could contain the following components.

```text
Account
  - balance
  - trust
  - identity

Device
  - account_id
  - hardware_profile
  - device_trust

TaskType
  - benchmark_cost
  - credit_price

Task
  - task_type
  - assigned_worker
  - result
  - validation_state

Scheduler
  - assignment
  - duplication
  - validator selection

Ledger
  - credits
  - debits
  - adjustments
```

---

# 14. The Three Fundamental Variables

The system can ultimately be summarized by three functions.

## Price

```text
price(task)
```

How many credits is this task worth?

## Trust

```text
trust(worker)
```

How much should this worker be trusted?

## Validity

```text
validity(result)
```

How likely is this result to be correct?

Accounting then uses those values:

```text
if result accepted:
    balance(worker) += price(task)
```

Validation and reputation only determine under which conditions the result can be considered sufficiently reliable.

---

# 15. Hypothesis to Test

The central hypothesis of the system is:

> It is possible to maintain an economically reliable network while validating only a small fraction of tasks, provided that validation frequency depends on worker reputation and disposable identities have sufficient cost.

This is probably **the first hypothesis that should be tested in simulation**.

The desired operating region is:

```text
low validation cost
+
fraud is economically unprofitable
+
low friction for honest users
```

---

# 16. References to Study

Two existing systems are particularly relevant:

- **BOINC**
- **Folding@home**

They have already addressed several related problems:

- distributed computing;
- task assignment;
- heterogeneous hardware;
- result validation;
- credit or point systems;
- implicit or explicit worker reputation.

The goal should be to reuse proven mechanisms wherever possible rather than reinventing the entire system.

