import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, telegramToken, telegramChatId, signal } = body;

    const results: Record<string, string> = {};

    // 1. Dispatch to Discord Webhook
    if (webhookUrl && webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
      try {
        const discordPayload = {
          username: "Institutional Quant Terminal",
          avatar_url: "https://cryptologos.cc/logos/solana-sol-logo.png",
          embeds: [
            {
              title: `🚨 LIQUIDITY SWEEP ENTRY: ${signal.symbol} [${signal.side}]`,
              color: signal.side === "LONG" ? 0x10b981 : 0xf43f5e,
              fields: [
                { name: "Side", value: `**${signal.side}**`, inline: true },
                { name: "Entry Price", value: `$${signal.entry_px}`, inline: true },
                { name: "Confluence Score", value: `${signal.confluence_score}/100 PTS`, inline: true },
                { name: "Stop Loss", value: `$${signal.sl_px}`, inline: true },
                { name: "Take Profit", value: `$${signal.tp_px}`, inline: true },
                { name: "Setup Type", value: `${signal.setup_type || "SMC_LIQUIDITY_SWEEP"}`, inline: true },
              ],
              footer: { text: "Analysis-Market // Multi-Asset Quant Engine" },
              timestamp: new Date().toISOString(),
            },
          ],
        };

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordPayload),
        });

        results.discord = res.ok ? "SUCCESS" : `FAILED_${res.status}`;
      } catch (e: any) {
        results.discord = `ERROR: ${e.message}`;
      }
    }

    // 2. Dispatch to Telegram Bot
    if (telegramToken && telegramChatId) {
      try {
        const text = `🚨 *LIQUIDITY SWEEP ENTRY: ${signal.symbol}*
Side: *${signal.side}*
Entry: *$${signal.entry_px}*
Stop Loss: *$${signal.sl_px}*
Take Profit: *$${signal.tp_px}*
Confluence: *${signal.confluence_score}/100 PTS*
Setup: \`${signal.setup_type || "SMC_SWEEP"}\`
Time: ${new Date().toISOString()}`;

        const tgUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        const res = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text,
            parse_mode: "Markdown",
          }),
        });

        results.telegram = res.ok ? "SUCCESS" : `FAILED_${res.status}`;
      } catch (e: any) {
        results.telegram = `ERROR: ${e.message}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Signal dispatch processed",
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch alert" },
      { status: 500 }
    );
  }
}
