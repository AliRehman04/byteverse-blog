import { NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const contactEmail = "alirehmanytlearning@gmail.com";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = cleanText(body.name, 80);
    const email = cleanText(body.email, 120).toLowerCase();
    const subject = cleanText(body.subject, 140) || "ByteVerse Contact Message";
    const message = cleanText(body.message, 4000);

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (message.length < 20) {
      return NextResponse.json(
        { error: "Please write a message with at least 20 characters." },
        { status: 400 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { error: "Email service not configured. Please email contact@byteverse.fyi directly." },
        { status: 503 }
      );
    }

    const { error } = await resend.emails.send({
      from: "ByteVerse Contact <onboarding@resend.dev>",
      to: contactEmail,
      replyTo: email,
      subject: `[ByteVerse] ${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">New Contact Form Message</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 100px;"><strong>Name</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Email</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;"><a href="mailto:${email}" style="color: #6366f1;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;"><strong>Subject</strong></td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${subject}</td>
            </tr>
          </table>
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
            <p style="margin: 0; color: #1e293b; white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">This message was sent from the ByteVerse contact form.</p>
        </div>
      `,
      text: `New contact form message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Message could not be sent. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
