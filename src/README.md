# The Library

The credit accounting library of a peer-to-peer inference network: a network where a machine earns credits by executing the tasks of other people, and spends those credits to have its own tasks executed by other machines.

The whole library follows one idea from section 1 of [the design note](../docs/design_note.md). Three questions are asked about every task, they are hard for different reasons, and they are never mixed together.

- **What is this task worth?** A price, in credits, read from what the task costs on one reference machine.
- **How much is this worker trusted?** A score that rises every time another worker confirms a result and falls every time one contradicts it.
- **Is this result correct?** A verdict reached by having a share of the tasks executed a second time and comparing the two answers.

Whatever those three answer, the movement of credits that follows is written into an append-only ledger, and a balance is never stored — it is rebuilt from the movements.

## Using it

```ts
import { Ledger, ResultComparator, TaskPricer } from './src/index.js';

const taskPricer = new TaskPricer({
	taskTypes: [
		{
			taskTypeName: 'reference task',
			referenceCostSeconds: 10,
		},
		{
			taskTypeName: 'task A',
			referenceCostSeconds: 30,
		},
	],
	referenceTaskCostSeconds: 10,
	creditPerReferenceTask: 1,
});

const resultComparator = new ResultComparator({
	defaultStrategy: {
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.001,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	strategyByTaskTypeName: new Map(),
});

const ledger = new Ledger();
const price = taskPricer.priceOf('task A');

if (resultComparator.compare('task A', '1.0000', '1.0004') === 'agreement') {
	ledger.append({
		tick: 7,
		accountId: 'alice',
		taskId: 'task-1',
		entryType: 'credit',
		amount: price,
		spendableFromTick: 17,
		reason: 'task A confirmed by a second worker',
		validationStatus: 'accepted',
	});
}

ledger.balanceOf('alice');
ledger.spendableBalanceOf('alice', 7);
```

Task A costs three times the reference task, so it is worth 3 credits. The two answers differ by less than the tolerance, so the worker is paid. The balance is 3, and the spendable balance at tick 7 is 0, because the payment only becomes spendable at tick 17.

That last line is the point of separating a balance from a spendable balance: a worker is paid at once, and the network keeps the right to take the credits back until the result has been verified.

## The folders

| Folder | Question it answers |
|---|---|
| `types/` | The shared shapes and their Zod schemas. No logic at all. |
| `pricing/` | What a task is worth: the reference benchmark, the price read as a ratio, and the recalibration owed when the model, the runtime, the precision format, or the hardware family changes. |
| `trust/` | How much a worker is trusted: the score of an account against the score of a device, the five penalties, and who is set aside. |
| `validation/` | Whether a result is correct: how often a task is executed a second time, the four ways two answers are compared, and how a disagreement is settled. |
| `ledger/` | The movements of credits, when a payment is recorded, and when it becomes spendable. |
| `identity/` | What opening an account costs, and how far an account may consume before it has contributed. |
| `scheduler/` | Who receives a task, who receives the duplicated copy, and who settles a disagreement. |
| `simulation/` | The primitives that run a whole simulated network over the modules above, and measure it. |

Each folder holds a `CONTEXT.md` stating what it is responsible for and which boundary must not be broken.

## The boundaries

The separation of the three questions is the whole design, so it is held by import rules rather than by good intentions.

- `pricing/`, `trust/`, and `validation/` never import from each other. A change in one of the three never forces a change in the other two.
- `ledger/` imports nothing from `pricing/`, `trust/`, `validation/`, or `identity/`. It receives an amount and a validation status, and it stores them. This is what keeps the accounting simple while the three other questions stay hard.
- `identity/` imports nothing from the other folders either. It reads balances as plain numbers, so the rule about who may spend is never mixed with the record of what was spent.
- `simulation/` may import from every other folder, and no other folder imports from `simulation/`.

Where a module would otherwise have to reach across one of those lines, it receives a function instead: `RandomNumberFn`, `DeviceEligibilityFn`, and `WorkerTrustFn` are declared in `types/` and handed in by whoever composes the parts.

## Two rules that hold everywhere

**The library never calls the global random number generator.** Every policy that needs randomness receives a `RandomNumberFn`. This is what lets a whole simulated run be reproduced from its seed, and without it a difference measured between two sets of parameters could not be told apart from the noise of the draw.

**Every question the design note leaves open is a parameter, never a fixed choice in the code.** The settlement policy, the penalty, the comparison of two answers, the weight of a device against its account, and the deficit allowed to a newcomer are all values passed in, because the point of the simulation is to measure the answers before choosing them.

## Where to go next

- `index.ts` is the one public interface. Nothing outside the library ever imports a file inside a subfolder.
- [`examples/first_simulation/`](../examples/first_simulation/README.md) runs a whole network over this library and prints what it measured.
- [`examples/parameter_sweeps/`](../examples/parameter_sweeps/README.md) runs it many times over and judges where the network is worth running.
- [`tests/`](../tests/CONTEXT.md) holds one test file per part of the library. Run them with `npm test`.
