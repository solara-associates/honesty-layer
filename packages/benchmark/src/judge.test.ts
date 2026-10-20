import { describe, expect, it } from "vitest";
import { createLlmJudge } from "./judge.js";
import type { ModelResponder } from "./ports.js";

function scriptedResponder(answer: string): ModelResponder {
  return {
    modelFamily: "openai",
    label: "scripted-judge",
    async respond() {
      return answer;
    },
  };
}

describe("createLlmJudge", () => {
  it("parses a 'yes' answer as true", async () => {
    const judge = createLlmJudge(scriptedResponder("Yes."));
    expect(await judge.askYesNo("Does this hold up?", "some response text", 1000)).toBe(true);
  });

  it("parses a 'no' answer as false", async () => {
    const judge = createLlmJudge(scriptedResponder("No, it does not."));
    expect(await judge.askYesNo("Does this hold up?", "some response text", 1000)).toBe(false);
  });

  it("treats anything not starting with 'yes' as false, rather than guessing", async () => {
    const judge = createLlmJudge(scriptedResponder("I'm not sure, maybe."));
    expect(await judge.askYesNo("Does this hold up?", "some response text", 1000)).toBe(false);
  });

  it("sends the context and question to the underlying responder", async () => {
    let capturedPrompt = "";
    const responder: ModelResponder = {
      modelFamily: "openai",
      label: "capture",
      async respond({ userPrompt }) {
        capturedPrompt = userPrompt;
        return "yes";
      },
    };
    const judge = createLlmJudge(responder);
    await judge.askYesNo("Is X true?", "the response under test", 1000);
    expect(capturedPrompt).toContain("Is X true?");
    expect(capturedPrompt).toContain("the response under test");
  });
});
