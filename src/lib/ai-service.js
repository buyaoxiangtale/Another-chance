const https = require('https');

// AI API 调用模块，支持 OpenAI-compatible 接口
class AIService {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.AI_API_KEY;
    this.baseUrl = config.baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    this.model = config.model || process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  // 创建请求选项
  createRequestOptions(options = {}) {
    const requestOptions = {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers
      },
      timeout: this.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(options.body));
    }

    return requestOptions;
  }

  // 发送 HTTP 请求
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const requestOptions = this.createRequestOptions(options);
      
      const req = https.request(url, requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${response.error?.message || 'Request failed'}`));
            } else {
              resolve(response);
            }
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  // 聊天完成 API
  async chatCompletion(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    
    const payload = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: options.stream || false,
      ...options
    };

    try {
      const response = await this.makeRequest(url, {
        body: payload
      });

      return response;
    } catch (error) {
      console.error('AI API Error:', error.message);
      throw error;
    }
  }

  // 流式聊天完成 API
  async chatCompletionStream(messages, options = {}) {
    const url = `${this.baseUrl}/chat/completions`;
    
    const payload = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: true,
      ...options
    };

    try {
      const response = await this.makeRequest(url, {
        body: payload
      });

      // 流式响应需要特殊处理
      if (response.choices && response.choices[0] && response.choices[0].delta) {
        return {
          content: response.choices[0].delta.content || '',
          finish_reason: response.choices[0].finish_reason
        };
      }

      return response;
    } catch (error) {
      console.error('AI API Error:', error.message);
      throw error;
    }
  }

  // 生成文本
  async generateText(prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.chatCompletion(messages, options);
    return response.choices[0].message.content;
  }

  // 测试连接
  async testConnection() {
    try {
      const response = await this.generateText('Hello, just testing the connection.');
      return {
        success: true,
        message: 'Connection successful',
        response: response.substring(0, 100) + '...' // 返回部分响应
      };
    } catch (error) {
      return {
        success: false,
        message: 'Connection failed',
        error: error.message
      };
    }
  }
}

module.exports = AIService;