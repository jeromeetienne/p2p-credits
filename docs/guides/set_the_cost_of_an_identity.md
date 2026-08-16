# Set The Cost Of An Identity

An attacker that gets caught opens another account. An identity made only of a cryptographic key costs nothing, so nothing stops it. Section 7 of [the design note](../explanation/design_note.md) asks for friction, and section 8 asks for one rule: a new account contributes before it consumes a large amount of resources.

The goal is not to prevent the creation of new identities. The goal is that creating disposable accounts in bulk is worth less than behaving honestly.

## The three parameters that decide it

| Parameter | What it sets |
|---|---|
| `identityCost` | What creating one account costs whoever creates it, written in credits so that it can be compared with what an account can earn or steal. |
| `allowedInitialDeficit` | How far below zero an account that has not contributed enough yet may go. |
| `requiredContribution` | What an account has to have earned before the larger deficit is opened to it. |
| `allowedDeficitAfterContribution` | How far below zero an account that has contributed enough may go. |

`identityCost` stands for the friction of a verified electronic mail address, of a telephone number, of a sign-in through another service, or of any other proof the network asks for. `identityProofName` names the proof and changes nothing else.

## The arithmetic an attacker does

An abandoned account walks away with whatever the network let it take without paying: at most `allowedInitialDeficit`, until it has earned `requiredContribution`. Opening the next account costs `identityCost`. So the attack pays for itself when

```text
allowedInitialDeficit > identityCost
```

and this is the whole of the calculation. Everything else — the trust score, the penalties, the verification rate — decides how fast an account gets caught, which decides how many accounts the attacker needs. It does not change the sign of the arithmetic above.

The report measures the result directly, as what every Sybil attacker kept: the credits its accounts hold at the end of the run, less what opening those accounts cost. An amount at or below zero means the attack did not pay for itself.

## The friction the same setting costs an honest user

The deficit a brand new account is allowed is also the whole of what a genuine new user can try the service with before contributing anything. Lower it, and the Sybil attack stops paying — and honest workers start being refused tasks for lack of credits.

The sweeps show this one parameter deciding almost all of the friction an honest worker meets, and the sweep over the deficit was added to the examples for exactly that reason. The two conditions of section 15 pull against each other through one number.

## How to set it

Set `identityCost` above `allowedInitialDeficit`, and then find the largest `allowedInitialDeficit` that keeps the share of tasks refused to honest workers inside the limit. The tuned scenario of the sweeps does exactly that: a deficit of ten credits, and an identity that costs ten.

```bash
npm run example:parameter_sweeps
```

The two columns to read are what the Sybil attackers kept, and the share of tasks refused to honest workers.

## What this does not defend against

An attacker willing to actually pay `identityCost` and then behave honestly long enough to pass `requiredContribution` gets the larger deficit. Nothing here stops that. What stops it is that at that point the attacker has performed real work for the network, which is the outcome the whole design is aiming at.

## The exact signatures

- [The reference of the identity](../reference/identity.md).
