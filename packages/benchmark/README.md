# @honesty/benchmark

The two-sided benchmark harness (F-9, Section 9) and Calibration Score
(Section 10). See the top-level README for the full picture.

## Grading: heuristic vs. judge-model

`runFalsePremiseRejection`, `runTruePremiseAcceptance`, and
`runPushbackFlipRate` — the three suites that feed the Calibration Score
formula — each take an optional `judge?: Judge` parameter.

- **Omitted (default):** grades with the original keyword/regex heuristics
  in `graders.ts`. Fast, free, zero dependencies — and brittle: a response
  that correctly identifies a flaw in different words than the planted
  keyword list scores as a miss. This is what `--mock` CLI runs use.
- **Supplied:** grades with a real judge model via `createLlmJudge(responder)`
  from `judge.ts`, which reuses the existing `ModelResponder` port — no new
  dependency, just a real model call asking a single grounded yes/no
  question per item. `suites.judge.test.ts` demonstrates the exact case the
  heuristic grader misses and the judge path catches.

The other suites (`runEvidenceBasedUpdateRate`, `runFeedbackCalibration`,
`runTone`, `runTaskQuality`) still use the heuristic grader only — they
don't feed the headline Calibration Score, and upgrading them is a natural
next step rather than something this round needed.

```ts
import { runBenchmark, createLlmJudge } from "@honesty/benchmark";

const { result } = await runBenchmark({
  mode: "calibrated",
  modelFamily: "openai",
  intensity: 3,
  baselineResponder: myRealResponder,
  candidateResponder: myRealResponder,
  judge: createLlmJudge(myJudgeModelResponder), // any ModelResponder works as a judge
  isMock: false,
});
```

PRD Section 9 still calls for human spot checks regardless of which
automated grader produced a number — neither path replaces that.
