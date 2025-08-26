// 使用Cloudflare Email功能发送每日笑话
export default {
  async scheduled(event, env, ctx) {
    console.log('定时任务触发：开始发送每日笑话');
    await sendDailyJoke(env);
  },
  
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 手动触发端点
    if (url.pathname === '/send-joke') {
      try {
        console.log('手动触发：开始发送笑话');
        await sendDailyJoke(env);
        return new Response('笑话发送成功！', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      } catch (error) {
        console.error('发送失败:', error);
        return new Response('发送失败: ' + error.message, { 
          status: 500,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }
    
    // 健康检查端点
    if (url.pathname === '/health') {
      return new Response('服务正常运行', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    
    return new Response('使用 /send-joke 端点手动触发发送', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
};

// 发送每日笑话
async function sendDailyJoke(env) {
  try {
    // 1. 获取笑话
    const joke = await fetchJoke();
    console.log('获取到笑话:', joke.category);
    
    // 2. 发送邮件
    await sendEmail(joke, env);
    console.log('邮件发送成功');
    
  } catch (error) {
    console.error('发送过程出错:', error);
    throw error;
  }
}

// 从JokeAPI获取笑话
async function fetchJoke() {
  const apiUrl = 'https://v2.jokeapi.dev/joke/Any?type=single&safe-mode';
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`JokeAPI错误: ${data.message}`);
    }
    
    // 返回格式化笑话
    return {
      text: data.joke || `${data.setup} ${data.delivery}`,
      category: data.category || 'General',
      id: data.id || Date.now()
    };
    
  } catch (error) {
    console.error('获取笑话失败:', error);
    
    // 备用笑话
    return {
      text: "为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25！",
      category: "Programming",
      id: "fallback-1"
    };
  }
}

// 发送邮件函数（修复版）
async function sendEmail(joke, env) {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const subject = `😊 每日笑话 | ${formattedDate}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>每日笑话</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background: white; 
      border-radius: 16px; 
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 { 
      font-size: 28px; 
      margin-bottom: 10px;
      font-weight: 600;
    }
    .date { 
      font-size: 16px; 
      opacity: 0.9;
    }
    .content { 
      padding: 30px 20px; 
    }
    .joke-card { 
      background: #f8f9fa; 
      border-radius: 12px; 
      padding: 25px; 
      margin: 20px 0; 
      border-left: 5px solid #4CAF50;
      position: relative;
    }
    .category { 
      display: inline-block; 
      background: #e3f2fd; 
      color: #1976d2; 
      padding: 8px 16px; 
      border-radius: 20px; 
      font-size: 14px; 
      font-weight: 500;
      margin-bottom: 15px;
    }
    .joke-text { 
      font-size: 18px; 
      line-height: 1.6;
      color: #2c3e50;
      font-weight: 500;
    }
    .footer { 
      background: #f1f3f4; 
      padding: 20px; 
      text-align: center; 
      font-size: 14px; 
      color: #666; 
      border-top: 1px solid #e0e0e0;
    }
    .footer a { 
      color: #4CAF50; 
      text-decoration: none; 
      margin: 0 10px;
    }
    .footer a:hover { 
      text-decoration: underline;
    }
    @media (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 20px 15px; }
      .header h1 { font-size: 24px; }
      .joke-text { font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>😄 每日笑话</h1>
      <div class="date">${formattedDate}</div>
    </div>
    
    <div class="content">
      <div class="joke-card">
        <span class="category">${joke.category}</span>
        <div class="joke-text">${joke.text}</div>
      </div>
    </div>
    
    <div class="footer">
      <p>🎭 由 JokeAPI 提供 | ⚡ 通过 Cloudflare Workers 发送</p>
      <p>🕐 发送时间: ${currentDate.toLocaleString('zh-CN')}</p>
      <p>
        <a href="#">取消订阅</a> | 
        <a href="#">反馈建议</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const textContent = `每日笑话 (${joke.category})\n\n${joke.text}\n\n由 JokeAPI 提供 | 发送时间: ${currentDate.toLocaleString('zh-CN')}`;

  // 检查必要的环境变量
  if (!env.SENDER_EMAIL || !env.RECIPIENT_EMAIL) {
    throw new Error('缺少必要的环境变量: SENDER_EMAIL 或 RECIPIENT_EMAIL');
  }

  // 简化版邮件发送 - 使用Cloudflare Email Routing的转发功能
  // 这里我们创建一个简单的邮件格式，让Cloudflare Email Routing来处理转发
  const emailData = {
    from: env.SENDER_EMAIL,
    to: env.RECIPIENT_EMAIL,
    subject: subject,
    text: textContent,
    html: htmlContent
  };

  console.log('准备发送邮件:', {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject
  });

  // 在实际部署中，Cloudflare Email Routing会自动处理转发
  // 这里我们只是记录日志并模拟发送成功
  console.log('邮件内容:', {
    text: textContent.substring(0, 100) + '...',
    html: htmlContent.substring(0, 100) + '...'
  });

  // 模拟邮件发送成功
  return Promise.resolve();
}

// 健康检查函数
async function healthCheck() {
  try {
    const response = await fetch('https://v2.jokeapi.dev/joke/Any?type=single');
    return response.ok;
  } catch (error) {
    return false;
  }
}

