// 主处理函数
export default {
  async scheduled(event, env, ctx) {
    // 每天7点执行（UTC时间，注意时区调整）
    await sendDailyJoke(env);
  },
  
  async fetch(request, env, ctx) {
    // 允许通过HTTP请求手动触发
    if (request.url.includes('/send-joke')) {
      try {
        await sendDailyJoke(env);
        return new Response('Joke sent successfully!');
      } catch (error) {
        return new Response('Error sending joke: ' + error.message, { status: 500 });
      }
    }
    
    return new Response('Use /send-joke endpoint to trigger manually');
  }
};

// 发送每日笑话
async function sendDailyJoke(env) {
  // 获取笑话
  const joke = await fetchJoke();
  
  // 使用Cloudflare Email Routing发送邮件
  await sendEmailViaCloudflare(joke, env);
}

// 从JokeAPI获取笑话
async function fetchJoke() {
  const response = await fetch('https://v2.jokeapi.dev/joke/Any?type=single');
  if (!response.ok) {
    throw new Error(`JokeAPI request failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`JokeAPI error: ${data.message}`);
  }
  
  return {
    text: data.joke || `${data.setup} - ${data.delivery}`,
    category: data.category
  };
}

// 使用Cloudflare Email Routing发送邮件
async function sendEmailViaCloudflare(joke, env) {
  // 创建邮件内容
  const subject = `每日笑话 - ${new Date().toLocaleDateString('zh-CN')}`;
  
  // 构建邮件消息
  const message = {
    from: env.SENDER_EMAIL,
    to: env.RECIPIENT_EMAIL,
    subject: subject,
    text: `每日笑话 (${joke.category})\n\n${joke.text}\n\n由 JokeAPI 提供 | 发送时间: ${new Date().toLocaleString('zh-CN')}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>每日笑话</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .joke-card { 
            background-color: #f9f9f9; 
            border-left: 4px solid #4CAF50; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 4px;
          }
          .category { 
            display: inline-block; 
            background-color: #e7f3fe; 
            color: #2196F3; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            margin-bottom: 10px;
          }
          .footer { 
            margin-top: 20px; 
            font-size: 12px; 
            color: #666; 
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>😄 每日笑话</h1>
          <div class="joke-card">
            <span class="category">${joke.category}</span>
            <p>${joke.text}</p>
          </div>
          <div class="footer">
            <p>由 JokeAPI 提供 | 通过 Cloudflare Workers 发送</p>
            <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
v
  // 使用Cloudflare Email API发送
  // 注意：Cloudflare Email Routing主要是接收邮件，发送需要通过其他方式
  // 这里我们使用Fetch API模拟邮件发送到Cloudflare Email地址
  // 实际部署时需要配置Email Routing规则
  
  // 替代方案：使用MailChannels（Cloudflare推荐）
  await sendViaMailChannels(message, env);
}

// 使用MailChannels发送（Cloudflare推荐方式）
async function sendViaMailChannels(message, env) {
  const mailRequest = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: message.to, name: '每日笑话订阅者' }],
          dkim_domain: env.DKIM_DOMAIN,
          dkim_selector: 'mailchannels',
          dkim_private_key: env.DKIM_PRIVATE_KEY,
        },
      ],
      from: {
        email: message.from,
        name: '每日笑话服务',
      },
      subject: message.subject,
      content: [
        {
          type: 'text/plain',
          value: message.text,
        },
        {
          type: 'text/html',
          value: message.html,
        },
      ],
    }),
  });

  const response = await fetch(mailRequest);
  if (!response.ok) {
    throw new Error(`Email sending failed: ${response.status} ${await response.text()}`);
  }
  
  console.log('Email sent successfully via MailChannels');
}
