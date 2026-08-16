# The Central Hypothesis

Section 15 of [the design note](design_note.md) states the one thing the whole repository exists to test.

> It is possible to maintain an economically reliable network while validating only a small fraction of tasks, provided that validation frequency depends on worker reputation and disposable identities have sufficient cost.

The desired region is three conditions at once: a low validation cost, fraud that is economically unprofitable, and low friction for honest users. A network that meets two of the three has not met the hypothesis. Any one of the three is easy on its own — verify nothing and the cost is zero; verify everything and fraud pays nothing; refuse nobody and there is no friction — and each of those ruins another.

## How the three become four numbers

`OperatingRegion.judge` turns the three conditions into a verdict, against four limits written down in `examples/parameter_sweeps/sweep_definitions.ts`.

| Condition | The limit |
|---|---|
| The validation cost is low | At most 20 percent of the executions spent on validation. |
| Fraud is unprofitable | At most 2 percent of the credits paid for wrong results, **and** what the Sybil attackers kept at or below zero. |
| Honest users meet little friction | At most 1 percent of correct results rejected, **and** at most 10 percent of tasks refused to honest workers. |

Those limits are a first guess. They are what the sweeps are held to, not a result the sweeps produced, and a reader who disagrees with a verdict should look at the limit behind it first.

## What was measured

```bash
npm run example:parameter_sweeps
```

Seven sweeps, each moving one parameter and nothing else, every point run with five seeds and averaged. The verdict is `no` at every value of every sweep.

The hypothesis survives, but only in a weakened form.

## The three findings

**The deficit allowed to a new account decides almost all of the friction.** Raising it removes the refusals an honest newcomer meets, and it is also exactly what an abandoned account walks away with, so raising it makes the Sybil attack less unprofitable. Two of the three conditions pull against each other through one number. [Setting the cost of an identity](../guides/set_the_cost_of_an_identity.md) is where that arithmetic is written out.

**Raising the initial trust makes verification cheap and makes fraud pay, in the same movement.** Trust extended to an account nobody has seen is a subsidy, and an attacker collects it as readily as a newcomer.

**The tuned scenario fails one condition at a time rather than three, and the condition it fails changes with the number of attackers.** With no attacker in the scenario at all it spends 16 percent of the computing power validating, inside the limit of 20 percent, and it still refuses 15 percent of the tasks of honest workers against a limit of 10 percent. Add two attackers and the friction falls to 9 percent while the validation cost climbs to 25 percent.

That movement is the important one. Neither number is the cost of catching cheats on its own: the cost of verifying newcomers is there whether or not anybody is cheating, and it is paid either in computing power spent verifying or in tasks refused to a newcomer that has not contributed yet.

## What that means for the hypothesis

The hypothesis says fraud can be made unprofitable while validating only a small fraction of tasks. What the sweeps show is that fraud can be made unprofitable — the tuned scenario does it, at every number of attackers up to four — and that the price of it is paid somewhere else every time. Held to a validation cost inside the limit, the network refuses too many tasks to honest newcomers; opened up so that a newcomer is refused nothing, it validates more than the limit allows. The floor is set by how much verification a newcomer needs before it can be trusted cheaply, and every network keeps meeting newcomers.

Three routes out of that are visible from here, and none of them has been measured.

- Make a newcomer cheaper to verify by making an identity carry evidence from outside the network, so that a new account does not start from nothing.
- Make a newcomer rarer by keeping accounts longer, which changes what the network is rather than how it verifies.
- Accept a higher limit than 20 percent, which is the honest answer if the floor turns out to be real, since the limit was a guess and the floor was a measurement.

## Related

- [Changing one parameter](../tutorial/03_changing_one_parameter.md)
- [The reference of the metrics](../reference/metrics.md)
- [The example that sweeps the parameters](../../examples/parameter_sweeps/README.md)
