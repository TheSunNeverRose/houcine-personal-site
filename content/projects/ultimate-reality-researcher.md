---
title: Ultimate Reality Researcher
description: A multi-stage AI research agent for comparing arguments about metaphysics and religion, including a failure I found in its own reasoning pipeline.
date: 2026-10-02
updated: 2026-10-16
category: AI-assisted research
status: in-progress
tags: [ai, philosophy, research, reasoning]
featured: true
---
## What I built

I made an AI-assisted research program to investigate questions about ultimate reality, starting with cosmology and necessary existence and eventually reaching questions about consciousness, morality, and religion. The point was to keep the steps between a premise and a conclusion visible instead of asking one model for a final answer.

The current source config sets the model name to `gemini-flash-latest` and uses Google's Gemini API. I built around the free tier through Google AI Studio because I wanted the project to cost nothing to run. Provider limits and model names can change, so the repository configuration is the source of truth for the current default.

[Open the code on GitHub](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher).

## How a cycle is meant to work

The repo defines 12 stages, from existence and cosmology through metaphysics, mind, morality, revelation, and comparative religion. Each cycle chooses a question for the current stage, gathers sources, has opposing arguments examined, updates stored state, and selects what to investigate next.

```text
Research question and stage
            |
            v
Propositions and dependencies (P1-P8)
            |
      +-----+------+
      |            |
      v            v
Argument builder  Critical researcher
      |            |
      +-----+------+
            v
     Four-round debate
            |
            v
   Adjudication / synthesis
            |
            v
 Evidence, verdict and confidence
            |
            v
 SQLite memory -> next question / report
```

The current implementation uses two opposing research agents and an adjudicator. The code separates their roles, records source information, stores debate data in SQLite, and can generate Markdown reports. These pieces are visible in [`debate.py`](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/debate.py#L280-L296), [`researcher.py`](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/researcher.py#L672-L699), and [`config.py`](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/config.py#L21-L25).

There is also an offline fallback. If the model call fails or its response cannot be parsed into the expected structure, the program can use preset fallback content and keep going. Each cycle records an `is_offline_fallback` flag. That is useful for resilience, but it matters when judging a result: a cycle completing does not by itself prove that Gemini supplied fresh analysis.

## A run pattern that made me suspicious

In an earlier run sequence, around cycles 7 to 25, the system kept returning to the Borde-Guth-Vilenkin theorem and the second law of thermodynamics when arguing for a finite cosmic past. The conclusion was labelled **PROBABLY** in the run I was tracking. This is a summary from my notes, not a verbatim transcript, and it refers to that earlier run rather than a guaranteed result from the current version.

The problem was not that those arguments are irrelevant. It was that seeing the same arguments again did not show that the investigation had improved. I could not point to a clear new source, a counterargument that had been resolved, or a change in the premises that explained why a later cycle deserved more confidence than an earlier one.

The BGV theorem concerns past-incompleteness under its expansion condition. That is not automatically the same as proving that absolutely all reality began to exist, and it does not establish that a cause beyond the universe must be personal. The thermodynamic argument also depends on the cosmological and entropy model being assumed. Those steps need their own arguments, not just a citation to the theorem.

The paper is available here: [Borde, Guth and Vilenkin, *Inflationary Spacetimes Are Incomplete in Past Directions* (2003)](https://doi.org/10.1103/PhysRevLett.90.151301).

## A concrete failure I found in the code

While inspecting the current repository on 16 October 2026, I noticed something more specific than repetitive answers. In [`debate.py`](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/debate.py#L280-L296), the adjudication pass obtains a verdict and confidence, then unconditionally overwrites `question_status`, `adjudicator_verdict`, and `confidence` with `UNDETERMINED`. The nearby comment says this is meant to preserve uncertainty when the foundational proposition is unproven, but the assignments shown there are not conditional on that proposition.

That means this version can erase the evaluator's own distinctions instead of applying the safeguard only when the dependency requires it. I have documented the problem here; I have not fixed or tested a code change for it yet. It is the clearest implementation issue I have been able to point to in the current public source.

## What I would count as progress

For a later cycle to count as an improvement, I want to be able to answer at least one of these questions with evidence from the saved report:

- Was a new, relevant source added and checked?
- Did the skeptic identify a premise the first argument had missed?
- Did the builder concede or revise a claim because of that objection?
- Did the conclusion or confidence change for a reason I can trace?
- Was the model used, or did the cycle rely on offline fallback content?

I have the architecture and the stored-cycle mechanism, but I still need to make the evaluation stricter. A longer transcript is not enough; the record should show what changed and why.

## What is and is not established

This is a working software project, not evidence that AI can settle metaphysics. I have built the research loop and examined some of its outputs. I have not established the truth of a religion or a final theory of reality. The useful result so far is narrower: the program gives me a concrete place to inspect how arguments, sources, uncertainty, and software behaviour interact.

## Code and documentation

- [Repository](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher)
- [Current model configuration](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/config.py)
- [Debate and adjudication code](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/debate.py)
- [Research-cycle and fallback handling](https://github.com/TheSunNeverRose/Ultimate-Reality-Researcher/blob/main/researcher.py)
