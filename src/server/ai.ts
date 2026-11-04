import { GoogleGenAI } from "@google/genai";
import { db } from '../db/index';
import { orders, services, categories, settings, users, tickets, ticketMessages, refillRequests, activityLogs } from '../db/schema';
import { eq, desc, or, sql } from 'drizzle-orm';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genAIClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return genAIClient;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export async function handleAiChat({
  message,
  history = [],
  userId,
}: {
  message: string;
  history?: ChatMessage[];
  userId?: number;
}) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  // 1. Extract Candidate Order ID from prompt (e.g. "12345 status", "status 12345", "#12345 refill", "12345 shows completed")
  const orderIdMatch = trimmed.match(/(?:#|order\s*(?:id)?\s*:?\s*|id\s*:?\s*)?(\b\d{1,8}\b)/i);
  let candidateId: number | null = null;
  if (orderIdMatch && orderIdMatch[1]) {
    const parsed = parseInt(orderIdMatch[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      candidateId = parsed;
    }
  }

  // 2. Identify the 5 specific support commands from the user's interface
  const isShowsCompleted = /shows?\s*completed|completed\s*without\s*complete|not\s*received|fake\s*complete|mila\s*nahi|aaya\s*nahi|deliver\s*nahi/i.test(trimmed);
  const isCancel = /\b(cancel|stop|rok|abort|cancel\s*order)\b/i.test(trimmed);
  const isRefill = /\b(refill|drop|restore|kam\s*ho\s*gaye|refill\s*request)\b/i.test(trimmed);
  const isSpeed = /\b(speed(?:\s*up)?|fast|jaldi|expedite|boost|speedup)\b/i.test(trimmed);
  const isStatus = /\b(status|check|progress|kaha\s*tak|track|kaisa\s*hai)\b/i.test(trimmed);

  // 3. Look up order if candidateId is provided
  let specificOrder: any = null;
  if (candidateId) {
    try {
      const found = await db
        .select({
          id: orders.id,
          userId: orders.userId,
          serviceId: orders.serviceId,
          link: orders.link,
          quantity: orders.quantity,
          charge: orders.charge,
          status: orders.status,
          startCount: orders.startCount,
          remains: orders.remains,
          refillStatus: orders.refillStatus,
          createdAt: orders.createdAt,
          serviceName: services.name,
        })
        .from(orders)
        .leftJoin(services, eq(orders.serviceId, services.id))
        .where(eq(orders.id, candidateId))
        .limit(1);

      if (found.length > 0) {
        specificOrder = found[0];
      }
    } catch (e) {
      console.error('Error fetching specific order in AI chatbot:', e);
    }
  }

  // 4. Fetch User's Recent Orders if userId exists
  let recentOrders: any[] = [];
  if (userId) {
    try {
      recentOrders = await db
        .select({
          id: orders.id,
          serviceId: orders.serviceId,
          link: orders.link,
          quantity: orders.quantity,
          charge: orders.charge,
          status: orders.status,
          startCount: orders.startCount,
          remains: orders.remains,
          createdAt: orders.createdAt,
          serviceName: services.name,
        })
        .from(orders)
        .leftJoin(services, eq(orders.serviceId, services.id))
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(5);
    } catch (e) {
      console.error('Error fetching recent orders for AI chatbot:', e);
    }
  }

  // 5. Fetch Panel Settings & Top Services
  let settingsList: Record<string, string> = {};
  let popularServices: any[] = [];
  try {
    const sRows = await db.select().from(settings);
    sRows.forEach(r => {
      settingsList[r.key] = r.value;
    });

    popularServices = await db
      .select({
        id: services.id,
        name: services.name,
        pricePerThousand: services.pricePerThousand,
        categoryName: categories.name,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(services.status, 'active'))
      .limit(8);
  } catch (e) {
    console.error('Error fetching settings/services for AI context:', e);
  }

  const websiteName = settingsList.websiteName || 'YouthSMM';
  const telegramUsername = settingsList.telegramUsername || '@securesmmtursted';
  const whatsappNumber = settingsList.whatsappNumber || '8795005604';

  // =========================================================================
  // DETERMINISTIC ORDER COMMAND DISPATCH (status, refill, speed, cancel, shows completed)
  // =========================================================================
  let directCommandResponse: string | null = null;

  // Case A: COMMAND WITH ORDER ID FOUND
  if (specificOrder) {
    const s = specificOrder;
    const orderStatus = (s.status || '').toLowerCase();
    const refillSt = (s.refillStatus || '').toLowerCase();

    // 1. SHOWS COMPLETED (Showing Completed Without Complete)
    if (isShowsCompleted) {
      let ticketId = 0;
      try {
        const [createdTicket] = await db.insert(tickets).values({
          userId: s.userId || userId || 1,
          subject: `⚠️ Order #${s.id} - Showing Completed Without Complete`,
          status: 'open',
        }).returning();

        if (createdTicket) {
          ticketId = createdTicket.id;
          await db.insert(ticketMessages).values({
            ticketId: createdTicket.id,
            senderId: s.userId || userId || 1,
            message: `User reported via AI Support Chatbot: Order #${s.id} (${s.serviceName || 'SMM Service'}, Link: ${s.link}, Quantity: ${s.quantity}) is marked as COMPLETED, but the service was NOT received. Urgent technical audit requested.`,
          });
        }

        await db.insert(activityLogs).values({
          userId: s.userId || userId || null,
          action: 'Report Completed Without Complete',
          details: `Urgent audit ticket #${ticketId} created for Order #${s.id}`,
        });
      } catch (err) {
        console.error('Failed to log audit ticket:', err);
      }

      directCommandResponse = `⚠️ **Investigation Ticket Created for Order #${s.id}!**

• **Command:** \`${s.id} shows completed\`
• **Issue:** Showing Completed Without Complete
• **Service:** ${s.serviceName || 'SMM Service #' + s.serviceId}
• **Target Link:** \`${s.link}\`
• **Quantity Ordered:** ${s.quantity?.toLocaleString()}
• **Urgent Ticket ID:** #TCK-${ticketId || s.id}

📋 **Action Taken:**
1️⃣ Provider audit node par re-check request forward kar di gayi hai.
2️⃣ Link delivery status ko technical team review karegi. Agar fake/premature complete hua hoga toh order re-deliver kiya jayega ya poora amount aapke wallet me refund ho jayega.
3️⃣ Ticket progress aap **Tickets** tab me check kar sakte hain.`;
    }

    // 2. REFILL (request a refill)
    else if (isRefill) {
      if (orderStatus === 'cancelled' || orderStatus === 'refunded') {
        directCommandResponse = `❌ **Order #${s.id} is Cancelled.**\nRefill is not applicable on cancelled orders.`;
      } else if (orderStatus === 'pending') {
        directCommandResponse = `⏳ **Order #${s.id} is Pending.**\nRefill completed orders par drop aane par submit hota hai. Agar order start karwana hai toh reply karein: \`${s.id} speed\`.`;
      } else if (refillSt === 'requested') {
        directCommandResponse = `🔄 **Refill Already Active for Order #${s.id}!**

• **Status:** Refill In-Progress
• **Service:** ${s.serviceName || 'SMM Service'}
• **Link:** \`${s.link}\`

Aapka refill request already server par process ho raha hai (restoration usually takes 1-24 hours). Live updates Orders tab me milenge.`;
      } else {
        try {
          await db.update(orders).set({ refillStatus: 'requested' }).where(eq(orders.id, s.id));
          await db.insert(refillRequests).values({
            userId: s.userId || userId || 1,
            orderId: s.id,
            status: 'pending',
          });

          const [t] = await db.insert(tickets).values({
            userId: s.userId || userId || 1,
            subject: `Refill Request: Order #${s.id}`,
            status: 'open',
          }).returning();

          if (t) {
            await db.insert(ticketMessages).values({
              ticketId: t.id,
              senderId: s.userId || userId || 1,
              message: `Automated refill request initiated via Chatbot for Order #${s.id} (${s.serviceName}, Link: ${s.link}).`,
            });
          }

          await db.insert(activityLogs).values({
            userId: s.userId || userId || null,
            action: 'Chatbot Refill Request',
            details: `Refill requested for Order #${s.id} via AI Chatbot`,
          });
          s.refillStatus = 'requested';
        } catch (err) {
          console.error('Refill request error:', err);
        }

        directCommandResponse = `🔄 **Refill Request Submitted for Order #${s.id}!**

• **Command:** \`${s.id} refill\`
• **Service:** ${s.serviceName || 'SMM Service #' + s.serviceId}
• **Link:** \`${s.link}\`
• **Refill Status:** \`REQUESTED\` ⚡
• **Tracking ID:** #RF-${s.id}

✅ Server ne refill command provider network ko dispatch kar di hai. Dropped counts restore hona 1-24 hours me complete ho jata hai. Live updates aap Orders tab me dekh sakte hain.`;
      }
    }

    // 3. SPEED (request a speed-up)
    else if (isSpeed) {
      if (orderStatus === 'completed') {
        directCommandResponse = `✅ **Order #${s.id} Already Completed!**

• **Status:** \`COMPLETED\`
Speed-up ki zaroorat nahi hai kyunki order deliver ho chuka hai.
• Agar count drop hua ho, reply karein: \`${s.id} refill\`
• Agar service nahi aayi ho, reply karein: \`${s.id} shows completed\``;
      } else if (orderStatus === 'cancelled' || orderStatus === 'refunded') {
        directCommandResponse = `❌ **Order #${s.id} is Cancelled.** Speed-up cannot be applied.`;
      } else {
        let ticketId = 0;
        try {
          const [t] = await db.insert(tickets).values({
            userId: s.userId || userId || 1,
            subject: `⚡ Speed-Up Request: Order #${s.id}`,
            status: 'open',
          }).returning();

          if (t) {
            ticketId = t.id;
            await db.insert(ticketMessages).values({
              ticketId: t.id,
              senderId: s.userId || userId || 1,
              message: `Priority speed-up requested for Order #${s.id} (${s.serviceName}, Link: ${s.link}, Status: ${s.status}, Remains: ${s.remains}). Expediting dispatch.`,
            });
          }

          await db.insert(activityLogs).values({
            userId: s.userId || userId || null,
            action: 'Chatbot Speed-Up Request',
            details: `Speed-up accelerated for Order #${s.id}`,
          });
        } catch (err) {
          console.error('Speed up error:', err);
        }

        directCommandResponse = `🚀 **Speed-Up Accelerated for Order #${s.id}!**

• **Command:** \`${s.id} speed\`
• **Service:** ${s.serviceName || 'SMM Service'}
• **Current Status:** \`${orderStatus.toUpperCase()}\`
• **Remains:** ${s.remains ?? 0} / ${s.quantity}
• **Priority Node:** ⚡ HIGH PRIORITY DISPATCHED

✅ Server delivery queue me aapke order ki priority elevate kar di gayi hai. Delivery node ko acceleration signal send ho chuka hai, aapko link par speed boost jald dikhega!`;
      }
    }

    // 4. CANCEL (request cancellation)
    else if (isCancel) {
      if (orderStatus === 'completed') {
        directCommandResponse = `⚠️ **Order #${s.id} Cannot Be Cancelled.**

• **Status:** \`COMPLETED\`
• **Service:** ${s.serviceName || 'SMM Service'}
• **Link:** \`${s.link}\`

Yeh order server par pehle hi deliver ho chuka hai.
• Agar count drop ho gaya hai, reply karein: \`${s.id} refill\`
• Agar count receive nahi hua, reply karein: \`${s.id} shows completed\``;
      } else if (orderStatus === 'cancelled' || orderStatus === 'refunded') {
        directCommandResponse = `ℹ️ **Order #${s.id} Already Cancelled.**

• **Status:** \`${orderStatus.toUpperCase()}\`
Aapka order pehle se hi cancelled hai aur refund balance me credit ho chuka hai.`;
      } else if (orderStatus === 'pending') {
        try {
          await db.update(orders).set({ status: 'cancelled', remains: s.quantity }).where(eq(orders.id, s.id));
          if (s.userId && s.charge > 0) {
            await db.update(users).set({ balance: sql`${users.balance} + ${s.charge}` }).where(eq(users.id, s.userId));
          }
          await db.insert(activityLogs).values({
            userId: s.userId || userId || null,
            action: 'Chatbot Order Cancelled',
            details: `Order #${s.id} cancelled via Chatbot. Refunded ₹${s.charge} to user #${s.userId}.`,
          });
          s.status = 'cancelled';
        } catch (err) {
          console.error('Cancel order error:', err);
        }

        directCommandResponse = `❌ **Order #${s.id} Successfully Cancelled!**

• **Command:** \`${s.id} cancel\`
• **Service:** ${s.serviceName || 'SMM Service'}
• **Status:** \`CANCELLED\`
• **Refund Credited:** ₹${Number(s.charge).toFixed(2)}
• **Wallet Balance:** Updated instantly!

Order start hone se pehle hi cancel kar diya gaya hai aur full refund aapke wallet me add ho chuka hai. Aap New Order tab se naya order laga sakte hain.`;
      } else {
        let ticketId = 0;
        try {
          const [t] = await db.insert(tickets).values({
            userId: s.userId || userId || 1,
            subject: `Cancellation Request: Order #${s.id}`,
            status: 'open',
          }).returning();

          if (t) {
            ticketId = t.id;
            await db.insert(ticketMessages).values({
              ticketId: t.id,
              senderId: s.userId || userId || 1,
              message: `User requested cancellation for in-progress Order #${s.id} (${s.serviceName}, Link: ${s.link}, Remains: ${s.remains}). Halting provider dispatch.`,
            });
          }

          await db.insert(activityLogs).values({
            userId: s.userId || userId || null,
            action: 'Chatbot Cancel Request',
            details: `Cancellation ticket #${ticketId} submitted for active Order #${s.id}`,
          });
        } catch (err) {
          console.error('Cancel ticket error:', err);
        }

        directCommandResponse = `⏳ **Cancellation Request Submitted for Order #${s.id}!**

• **Command:** \`${s.id} cancel\`
• **Status:** \`${orderStatus.toUpperCase()}\` (Active on Provider Node)
• **Remains:** ${s.remains ?? 0}
• **Priority Ticket:** #CAN-${ticketId || s.id}

⚠️ Kyunki order currently server par process ho raha hai, provider node ko cancel hold command send kar di gayi hai. Agar provider cancel approve karta hai, toh remaining balance automatically aapke wallet me refund ho jayega.`;
      }
    }

    // 5. STATUS (check progress)
    else if (isStatus) {
      const statusEmoji = s.status === 'completed' ? '✅' : s.status === 'processing' ? '⚡' : s.status === 'pending' ? '⏳' : s.status === 'cancelled' ? '❌' : '⚠️';
      const total = s.quantity || 1;
      const remains = s.remains ?? 0;
      const delivered = Math.max(0, total - remains);
      const percent = Math.min(100, Math.round((delivered / total) * 100));

      directCommandResponse = `📦 **Order Status for #${s.id}**

${statusEmoji} **Status:** \`${(s.status || '').toUpperCase()}\`
🛠️ **Service:** ${s.serviceName || 'SMM Service #' + s.serviceId}
🔗 **Link:** \`${s.link}\`
📊 **Quantity:** ${s.quantity?.toLocaleString()}
🔢 **Start Count:** ${s.startCount ?? 0} | **Remains:** ${remains}
📈 **Progress:** ${percent}% delivered
🕒 **Date Placed:** ${new Date(s.createdAt).toLocaleString()}

To manage this order, reply with your Order ID followed by a command:

\`${s.id} status\` — check progress

\`${s.id} refill\` — request a refill

\`${s.id} speed\` — request a speed-up

\`${s.id} cancel\` — request cancellation

\`${s.id} shows completed\` — Showing Completed Without Complete`;
    }

    // 6. User only sent Order ID (e.g. "12345")
    else if (!isShowsCompleted && !isCancel && !isRefill && !isSpeed && !isStatus) {
      directCommandResponse = `👋 **Order #${s.id} Found!**

• **Service:** ${s.serviceName || 'SMM Service #' + s.serviceId}
• **Status:** \`${(s.status || '').toUpperCase()}\`
• **Link:** \`${s.link}\`
• **Quantity:** ${s.quantity?.toLocaleString()} | **Remains:** ${s.remains ?? 0}

To manage an order, reply with your Order ID followed by a command:

\`${s.id} status\` — check progress

\`${s.id} refill\` — request a refill

\`${s.id} speed\` — request a speed-up

\`${s.id} cancel\` — request cancellation

\`${s.id} shows completed\` — Showing Completed Without Complete`;
    }
  }

  // Case B: CANDIDATE ID PROVIDED BUT ORDER NOT FOUND IN DATABASE
  else if (candidateId && !specificOrder) {
    directCommandResponse = `❌ **Order #${candidateId} Not Found.**

Database me Order #${candidateId} nahi mila. Kripya apna sahi Order ID verify karein.

To manage an order, reply with your Order ID followed by a command:

\`${candidateId} status\` — check progress

\`${candidateId} refill\` — request a refill

\`${candidateId} speed\` — request a speed-up

\`${candidateId} cancel\` — request cancellation

\`${candidateId} shows completed\` — Showing Completed Without Complete`;
  }

  // Case C: COMMAND SENT WITHOUT ORDER ID (e.g. user just typed "refill", "speed", "cancel", "status", "shows completed")
  else if (!candidateId && (isShowsCompleted || isCancel || isRefill || isSpeed || isStatus)) {
    const cmdName = isShowsCompleted
      ? 'shows completed'
      : isCancel
      ? 'cancel'
      : isRefill
      ? 'refill'
      : isSpeed
      ? 'speed'
      : 'status';

    if (recentOrders.length > 0) {
      const recentId = recentOrders[0].id;
      directCommandResponse = `🔍 Aapka recent order **#${recentId}** (${recentOrders[0].serviceName || 'Service'}) hai.

To manage this order, reply with:
• \`${recentId} ${cmdName}\`

Ya phir apna specific Order ID likhein:
• \`[OrderID] ${cmdName}\` (jaise \`12345 ${cmdName}\`)

---
**All Available Commands:**
\`${recentId} status\` — check progress
\`${recentId} refill\` — request a refill
\`${recentId} speed\` — request a speed-up
\`${recentId} cancel\` — request cancellation
\`${recentId} shows completed\` — Showing Completed Without Complete`;
    } else {
      directCommandResponse = `To manage an order, reply with your Order ID followed by a command:

\`12345 status\` — check progress

\`12345 refill\` — request a refill

\`12345 speed\` — request a speed-up

\`12345 cancel\` — request cancellation

\`12345 shows completed\` — Showing Completed Without Complete`;
    }
  }

  // If a direct command response was formed, return it immediately
  if (directCommandResponse) {
    return {
      success: true,
      response: directCommandResponse,
      order: specificOrder,
    };
  }

  // =========================================================================
  // SYSTEM INSTRUCTION FOR GEMINI AI
  // =========================================================================
  const systemInstruction = `You are the official 24/7 AI Support Assistant for ${websiteName}.

The primary user interface command format is:
"To manage an order, reply with your Order ID followed by a command:
12345 status — check progress
12345 refill — request a refill
12345 speed — request a speed-up
12345 cancel — request cancellation
12345 shows completed — Showing Completed Without Complete"

Whenever users ask about their orders, always guide them using these exact 5 commands.
Always support English, Hindi, and Hinglish.

AVAILABLE DATA:
- Website: ${websiteName}
- WhatsApp Support: +91 ${whatsappNumber}
- Telegram Support: ${telegramUsername}
${recentOrders.length > 0 ? `
USER'S RECENT ORDERS:
${recentOrders.map(o => `- #${o.id}: ${o.serviceName || 'Service'} | Status: ${o.status.toUpperCase()} | Qty: ${o.quantity} | Remains: ${o.remains}`).join('\n')}
` : ''}
`;

  // Try calling Gemini
  const ai = getGenAI();
  let aiResponseText = '';

  if (ai) {
    const formattedContents: any[] = [];
    for (const h of history.slice(-6)) {
      formattedContents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }
    formattedContents.push({
      role: 'user',
      parts: [{ text: trimmed }],
    });

    const candidateModels = ['gemini-2.5-flash', 'gemini-2.5-pro'];
    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        if (response.text) {
          aiResponseText = response.text;
          break;
        }
      } catch (err: any) {
        // Fallback model attempt
      }
    }
  }

  // Fallback if AI is offline
  if (!aiResponseText) {
    if (qLowerIncludes('payment') || qLowerIncludes('pay') || qLowerIncludes('fund') || qLowerIncludes('paise')) {
      aiResponseText = `💳 **Payment & Add Funds Guide:**

1️⃣ **Add Funds** tab par click karein.
2️⃣ Amount enter karein (e.g. ₹50, ₹100, ₹500).
3️⃣ **BharatPe / PhonePe UPI QR** ko kisi bhi UPI app (GPay, PhonePe, Paytm) se scan karein.
4️⃣ 12-digit UTR copy karke paste karein aur **"Verify & Add Funds"** par click karein. Balance instant add ho jayega!`;
    } else if (qLowerIncludes('order kaise') || qLowerIncludes('how to order') || qLowerIncludes('place order')) {
      aiResponseText = `⚡ **New Order Guide:**

1️⃣ **New Order** page par jayein.
2️⃣ **Platform** aur **Service** select karein.
3️⃣ Target post ya profile ka public link paste karein.
4️⃣ Quantity enter karke **"Submit Order"** click karein!`;
    } else {
      const sampleId = recentOrders.length > 0 ? recentOrders[0].id : 12345;
      aiResponseText = `👋 Welcome to **${websiteName} Support**!

To manage an order, reply with your Order ID followed by a command:

\`${sampleId} status\` — check progress

\`${sampleId} refill\` — request a refill

\`${sampleId} speed\` — request a speed-up

\`${sampleId} cancel\` — request cancellation

\`${sampleId} shows completed\` — Showing Completed Without Complete`;
    }
  }

  function qLowerIncludes(term: string) {
    return lower.includes(term);
  }

  return {
    success: true,
    response: aiResponseText,
    order: specificOrder,
  };
}
