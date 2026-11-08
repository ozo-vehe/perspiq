# Perspiq

Perspiq is an AI-powered health-literacy workspace that turns complex medical test language into clear, cautious explanations. It is educational, not diagnostic, and helps users prepare better questions for a clinician.

## Why it fits Build What's Next with PayPal and AI

- **AI is central:** Perspiq uses an AI model to interpret pasted medical text and supported documents into structured plain-language explanations, reference ranges, uncertainty states, and clinician questions.
- **PayPal is central to access:** after the five free translations, Perspiq Plus uses PayPal Checkout to unlock continued access. The server creates and captures PayPal orders; credentials are never exposed to the browser.
- **Human-centered outcome:** the product is designed for health literacy, with explicit non-diagnostic boundaries and prompts to speak with a care team.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Add the project AI credentials and PayPal sandbox credentials from a PayPal Developer sandbox app.
4. Start with `npm run dev` and open `http://localhost:3000`.
5. Sign in, translate sample medical text, then test the Plus checkout from `/subscribe`.

PayPal runs in sandbox mode unless `PAYPAL_ENVIRONMENT=live` is set. For a hosted demo, set the return and cancel URLs to the deployed `/subscribe` URL.

## Important safety boundary

Perspiq does not diagnose, prescribe, or replace professional medical advice. AI output can be incomplete or wrong; users should confirm important decisions with a qualified clinician.

## Submission notes

The demo should show: sign-in, a medical-text translation, structured results and doctor questions, the five-free-use boundary, and PayPal sandbox checkout. The AI provider and PayPal sandbox are configured through environment variables.
