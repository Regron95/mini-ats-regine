import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cv_text, job_title } = await req.json();

    if (!cv_text) {
      return new Response(
        JSON.stringify({ error: "cv_text saknas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Du är en erfaren rekryterare. Bedöm följande CV för tjänsten "${job_title || "okänd tjänst"}".

CV:
${cv_text}

Svara ENBART med ett JSON-objekt i detta exakta format (ingen annan text):
{
  "sammanfattning": "2-3 meningar om kandidaten",
  "styrkor": ["styrka 1", "styrka 2", "styrka 3"],
  "svagheter": ["svaghet 1", "svaghet 2"],
  "matchning": 7
}

matchning är ett heltal 1-10 där 10 är perfekt matchning mot tjänsten.`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "{}";

    let assessment;
    try {
      assessment = JSON.parse(text);
    } catch {
      assessment = { sammanfattning: text, styrkor: [], svagheter: [], matchning: 0 };
    }

    return new Response(JSON.stringify(assessment), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
