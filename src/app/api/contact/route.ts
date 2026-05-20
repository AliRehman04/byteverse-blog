import { NextResponse } from "next/server";

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
    const subject = cleanText(body.subject, 140) || "ByteVerse contact message";
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

    const response = await fetch(`https://formsubmit.co/ajax/${contactEmail}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        source: "ByteVerse contact page",
        _subject: `ByteVerse Contact: ${subject}`,
        _template: "table",
        _captcha: "false",
        _replyto: email,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Message could not be sent right now. Please email us directly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: "Message sent successfully." });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}