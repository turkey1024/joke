/**
 * 每日笑话发送Worker
 * 使用Brevo SMTP API发送邮件
 */

// 备用笑话列表
const backupJokes = [
  "为什么小鸡过马路？因为它要到对面去！",
  "我告诉我电脑我需要休息一下，现在它不让我回来了。",
  "为什么数学书总是很伤心？因为它有太多问题要解决。",
  "程序员最讨厌的单词是什么？Bug。",
  "为什么程序员总是分不清万圣节和圣诞节？因为Oct 31 == Dec 25。",
  "我有个关于栈的笑话，但是它会溢出。",
  "为什么开发者总是打不开窗户？因为他们没有窗把手(window.handle)。",
  "我的代码曾经bug很多，直到我加了音乐。现在它是重金属(heavy metal)了。"
];

// 获取随机笑话
function getRandomJoke() {
  const randomIndex = Math.floor(Math.random() * backupJokes.length);
  return backupJokes[randomIndex];
}

// 从JokeAPI获取笑话
async function fetchJokeFromAPI() {
  try {
    const apiUrl = typeof JOKE_API_URL !== 'undefined' ? JOKE_API_URL : 
      "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=single";
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API返回错误: ${data.message}`);
    }
    
    if (data.type === 'single') {
      return data.joke;
    } else if (data.type === 'twopart') {
      return `${data.setup}\n\n${data.delivery}`;
    }
    
    return getRandomJoke();
    
  } catch (error) {
    console.error('从API获取笑话失败:', error.message);
    return getRandomJoke();
  }
}

// 使用Brevo发送邮件
async function sendEmailWithBrevo(jokeContent) {
  const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';
  
  const emailData = {
    sender: {
      name: '每日笑话机器人',
      email: SENDER_EMAIL
    },
    to: [
      {
        email: RECIPIENT_EMAIL,
        name: '笑话爱好者'
      }
    ],
    subject: '😂 您的每日笑话已送达！',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>每日笑话</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .joke-box { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px; 
            border-radius: 15px; 
            text-align: center; 
            font-size: 18px; 
            margin: 20px 0; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #666; 
            font-size: 12px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 style="text-align: center; color: #667eea;">🌞 每日一笑</h1>
          <div class="joke-box">
            ${jokeContent.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>祝您拥有愉快的一天！</p>
            <p>本邮件由Cloudflare Worker自动发送</p>
          </div>
        </div>
      </body>
      </html>
    `,
    textContent: `😂 每日笑话 😂\n\n${jokeContent}\n\n祝您拥有愉快的一天！`
  };

  try {
    const response = await fetch(brevoApiUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_SMTP_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Brevo API错误: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log('邮件发送成功:', result.messageId);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error('发送邮件失败:', error.message);
    throw error;
  }
}

// 主处理函数
export default {
  async scheduled(event, env, ctx) {
    try {
      console.log('开始执行每日笑话任务...');
      
      // 从环境变量获取配置
      const { BREVO_SMTP_KEY, SENDER_EMAIL, RECIPIENT_EMAIL, JOKE_API_URL } = env;
      
      // 检查必要的环境变量
      if (!BREVO_SMTP_KEY || !SENDER_EMAIL || !RECIPIENT_EMAIL) {
        throw new Error('缺少必要的环境变量配置');
      }
      
      // 获取笑话内容
      let jokeContent;
      try {
        jokeContent = await fetchJokeFromAPI();
        console.log('成功从API获取笑话');
      } catch (apiError) {
        console.warn('使用备用笑话:', apiError.message);
        jokeContent = getRandomJoke();
      }
      
      // 发送邮件
      const result = await sendEmailWithBrevo(jokeContent);
      
      console.log('每日笑话任务执行成功');
      return new Response(JSON.stringify({
        success: true,
        message: '邮件发送成功',
        messageId: result.messageId,
        joke: jokeContent
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('任务执行失败:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
  
  // 用于测试的fetch处理器
  async fetch(request, env, ctx) {
    if (request.method === 'POST') {
      const { BREVO_SMTP_KEY, SENDER_EMAIL, RECIPIENT_EMAIL } = env;
      
      if (!BREVO_SMTP_KEY || !SENDER_EMAIL || !RECIPIENT_EMAIL) {
        return new Response('环境变量未配置', { status: 500 });
      }
      
      try {
        const jokeContent = await fetchJokeFromAPI();
        const result = await sendEmailWithBrevo(jokeContent);
        
        return new Response(JSON.stringify({
          success: true,
          message: '测试邮件发送成功',
          messageId: result.messageId,
          joke: jokeContent
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('使用POST方法发送测试邮件', { status: 200 });
  }
};

