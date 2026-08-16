# The Account Or The Device

Section 12.3 of [the design note](design_note.md) asks whether trust belongs to the account, to the device, or to both, and gives the example that makes the question real: Alice has a highly trusted account and adds a new unknown graphics card. Should that new device immediately inherit the full trust of the account? Probably not entirely.

"Probably not entirely" is not a number, so the library makes it one.

## The mechanism

An account carries a score and a device carries a score. The trust of a worker is the two mixed:

```text
trust(worker) = (1 - deviceTrustWeight) * trust(account) + deviceTrustWeight * trust(device)
```

`deviceTrustWeight` is a parameter between 0 and 1, and the two ends of the range are the two answers the design note names.

- At 0, the trust is the account's alone. A new device inherits the whole history of its account the moment it is added.
- At 1, the trust is the device's alone. A new device earns its trust from nothing, whatever its account did.

Anything in between is the "both" the design note suspects is right, and the parameter is what makes it measurable rather than argued.

A judged result moves both scores. A confirmed result raises the account and the device; a contradicted result lowers both, and the penalty attached to it is read from the account.

## The two attacks the two ends invite

**At 0, a device is a free identity.** An attacker behaves honestly long enough to build a trusted account, then adds device after device, each one arriving fully trusted and each one verified as rarely as the account has earned. The cost of an identity was paid once, and the attacker has as many trusted workers as it has hardware.

**At 1, an honest user is punished for buying hardware.** Every new machine starts as a stranger, is verified at the newcomer rate, and earns slowly. A user with several machines pays the newcomer cost several times over, and the network pays the verification bill for all of them.

The first is a security failure and the second is a friction failure, and they are the two ends of the same parameter.

## What the simulation measures

The scenario adds a second device to every account partway through the run. The tick it happens at is the `secondDeviceTick` parameter, and the moment is chosen so that both interesting cases occur at once: a trusted account meets a device that earned nothing, and a caught account meets one too.

The `devices` part of the printed report is where the result is read.

```bash
npm run example:first_simulation
```

For each device it prints the trust of the device, the trust of the account that owns it, the combined trust the worker is judged with, and the tick the device joined. Comparing the second device of an honest account against the second device of a malicious account says what the current weight handed over in each case.

## What is not answered

The repository does not conclude a value. It makes the question a parameter, prints what each value costs, and stops there — which is the position the design note takes as well.

What is missing to answer it properly is a scenario where the attack the low weight invites is actually played: an attacker that behaves honestly, builds a trusted account, and only then adds devices in bulk. The simulated Sybil attacker does not do that; it fabricates results from the start and abandons its account when caught. The device sweep therefore measures the friction end of the trade honestly and the security end of it only partly.

## Related

- [The reference of the trust](../reference/trust.md)
- [Choose a penalty](../guides/choose_a_penalty.md)
