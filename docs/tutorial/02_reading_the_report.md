# 2. Reading The Report

This lesson reads the report printed by the command of lesson 1.

```bash
npm run example:first_simulation
```

Every number in the report belongs to one of the four families of metrics of section 11 of [the design note](../explanation/design_note.md): security, cost, economics, and user experience. A network is not judged by any one of them. It is judged by all four at once, because every one of them can be made perfect by ruining another.

The full list of measured numbers, with the exact name of each field, is in [the reference of the metrics](../reference/metrics.md). This lesson reads the parts of the printed report instead, and says which value of each is bad.

## cost

How many tasks were submitted, how many executions that took, and what share of the computing power was spent verifying rather than producing.

The share spent verifying is the price of the whole validation idea. A network that verifies every result executes every task twice and loses most of its economic advantage. The limit the examples hold the network to is 20 percent, and the number to watch is `validationShare`.

**Bad:** a share close to 1, which is a network that duplicates nearly everything.

## security

How many wrong values were returned, how many the network rejected, how many it paid for without noticing, and how many correct values it rejected by mistake.

A wrong value paid for without noticing is fraud that worked. A correct value rejected is an honest worker punished for the ordinary imprecision of its machine. These two numbers move in opposite directions: any comparison strict enough to catch everything also rejects honest workers.

**Bad:** a large share of wrong values paid for, and, just as bad, a large share of correct values rejected.

## identity

How many accounts were opened, how many a Sybil attacker abandoned, what opening them cost, what the Sybil attackers kept in the end, and how many tasks were refused for lack of credits.

The number that decides whether the identity idea works is what the Sybil attackers kept: the credits their accounts hold at the end, less what opening those accounts cost. The goal was never to stop an attacker from opening accounts. The goal is that opening them, in bulk, is worth less than behaving honestly.

**Bad:** an amount above zero, which is an attack that paid for itself.

## economics

Credits created, credits consumed, and credits not settled yet at the end of the run.

Credits created for every credit consumed is the inflation of the network. A network that creates far more than it consumes is paying for work nobody asked for.

**Bad:** a ratio far above 1, and a large amount of credits held by the richest tenth of the accounts.

## price

The measured cost against the true cost for every task type, and the arbitrage between them.

Only the simulation knows the true cost. The network reads the cost the benchmark measured, and a benchmark carries measurement noise, so the prices the network works with are a few percent wrong. The arbitrage is the highest profitability ratio divided by the lowest: how much a worker would gain by only accepting the task type the benchmark over-measured.

**Bad:** an arbitrage far above 1, which is an invitation to pick the profitable task type. The scheduler is what stops a worker from acting on it, because a worker never selects its own task.

## validity

How each comparison behaved, task type by task type, and how many genuine results it threw away.

## workers and devices

What each kind of worker earned and how the network judged it, and what each account handed to the second device it added halfway through the run.

The devices part is where the question of section 12.3 of the design note becomes visible: a trusted account meets a device that earned nothing. How much of the account's history the new device inherits is the `deviceTrustWeight` parameter, and [the account or the device](../explanation/account_or_device.md) explains what turns on it.

## The two extra sets of runs

**Comparing character for character.** The same scenario with one single change: every task type compared exactly. Two genuine executions of an inference never write the same numbers, so this run shows what a network costs itself when it only knows how to compare exactly. It does not reject honest workers loudly. It leaves tasks with no majority at all, and pays nobody for them.

**Timing of payment.** The same scenario once per settlement policy, so that the price of making a worker wait before it can spend can be read in one table. [Choosing a settlement policy](../guides/choose_a_settlement_policy.md) is the guide for that choice.

## Next

- [3. Changing one parameter](03_changing_one_parameter.md)
