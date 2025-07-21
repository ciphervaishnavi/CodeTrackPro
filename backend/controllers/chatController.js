const OpenAI = require('openai');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const User = require('../models/User');
const PlatformAccount = require('../models/PlatformAccount');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// In-memory chat history storage (in production, use Redis or database)
const chatSessions = new Map();

/**
 * @desc    Send a message to AI chat bot
 * @route   POST /api/chat/message
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
    const { message, context } = req.body;
    const userId = req.user.id;

    // Get user's chat session or create new one
    let chatHistory = chatSessions.get(userId) || [];

    // Get user profile and platform data for context
    const user = await User.findById(userId).select('-password -refreshToken');
    const platformAccounts = await PlatformAccount.find({ 
        userId: userId, 
        isActive: true 
    });

    // Build context for AI
    const userContext = {
        profile: {
            name: user.name,
            username: user.username,
            cScore: user.cScore,
            rank: user.rank,
            bio: user.bio
        },
        platforms: platformAccounts.map(account => ({
            platform: account.platformName,
            username: account.username,
            stats: account.stats
        })),
        additionalContext: context
    };

    // Prepare system message with user context
    const systemMessage = {
        role: 'system',
        content: `You are an AI coding mentor for CodeTrackPro, a platform that tracks coding progress across multiple competitive programming platforms. 

User Profile:
- Name: ${userContext.profile.name}
- C-Score: ${userContext.profile.cScore}
- Rank: ${userContext.profile.rank}
- Connected Platforms: ${userContext.platforms.map(p => `${p.platform} (${p.username})`).join(', ')}

Platform Statistics:
${userContext.platforms.map(p => 
    `${p.platform}: ${p.stats.totalProblemsSolved} problems solved, Rating: ${p.stats.contestRating}, Streak: ${p.stats.streak.current} days`
).join('\n')}

Your role is to:
1. Provide coding guidance and help with problem-solving strategies
2. Analyze the user's progress and suggest improvements
3. Recommend problems based on their current level
4. Help with algorithm and data structure concepts
5. Motivate and encourage continued learning
6. Answer questions about competitive programming

Keep responses helpful, encouraging, and focused on coding improvement. Use the user's statistics to personalize your advice.`
    };

    // Add user message to chat history
    chatHistory.push({ role: 'user', content: message });

    // Prepare messages for OpenAI (limit to last 10 exchanges to manage token usage)
    const recentHistory = chatHistory.slice(-20); // Last 10 user-bot exchanges
    const messages = [systemMessage, ...recentHistory];

    try {
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 500,
            temperature: 0.7,
            presence_penalty: 0.2,
            frequency_penalty: 0.2
        });

        const aiResponse = completion.choices[0].message.content;

        // Add AI response to chat history
        chatHistory.push({ role: 'assistant', content: aiResponse });

        // Update chat session
        chatSessions.set(userId, chatHistory);

        res.status(200).json({
            status: 'success',
            data: {
                message: aiResponse,
                timestamp: new Date(),
                usage: {
                    prompt_tokens: completion.usage.prompt_tokens,
                    completion_tokens: completion.usage.completion_tokens,
                    total_tokens: completion.usage.total_tokens
                }
            }
        });

    } catch (error) {
        console.error('OpenAI API Error:', error);
        
        if (error.code === 'insufficient_quota') {
            throw new AppError('AI service is currently unavailable due to quota limits', 503);
        } else if (error.code === 'rate_limit_exceeded') {
            throw new AppError('Too many requests. Please try again later.', 429);
        } else {
            throw new AppError('AI service is currently unavailable', 503);
        }
    }
});

/**
 * @desc    Get chat history for the user
 * @route   GET /api/chat/history
 * @access  Private
 */
const getChatHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const chatHistory = chatSessions.get(userId) || [];
    
    // Return recent messages with timestamps
    const formattedHistory = chatHistory
        .slice(-parseInt(limit))
        .map((msg, index) => ({
            id: `msg_${Date.now()}_${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(Date.now() - (chatHistory.length - index) * 60000) // Approximate timestamps
        }));

    res.status(200).json({
        status: 'success',
        data: {
            messages: formattedHistory,
            totalMessages: chatHistory.length
        }
    });
});

/**
 * @desc    Clear chat history for the user
 * @route   DELETE /api/chat/history
 * @access  Private
 */
const clearChatHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Clear chat session
    chatSessions.delete(userId);

    res.status(200).json({
        status: 'success',
        message: 'Chat history cleared successfully'
    });
});

/**
 * @desc    Get AI-powered suggestions based on user's profile
 * @route   GET /api/chat/suggestions
 * @access  Private
 */
const getChatSuggestions = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user profile and platform data
    const user = await User.findById(userId).select('-password -refreshToken');
    const platformAccounts = await PlatformAccount.find({ 
        userId: userId, 
        isActive: true 
    });

    if (platformAccounts.length === 0) {
        return res.status(200).json({
            status: 'success',
            data: {
                suggestions: [
                    "Connect your first platform account to get personalized suggestions!",
                    "Start with easy problems to build confidence",
                    "Focus on learning basic data structures like arrays and strings",
                    "Practice regularly to build a coding streak"
                ]
            }
        });
    }

    // Calculate aggregate stats
    const totalProblems = platformAccounts.reduce((sum, account) => 
        sum + account.stats.totalProblemsSolved, 0
    );
    const avgRating = platformAccounts.reduce((sum, account) => 
        sum + account.stats.contestRating, 0
    ) / platformAccounts.length;
    const currentStreak = Math.max(...platformAccounts.map(account => 
        account.stats.streak.current
    ));

    // Generate personalized suggestions based on stats
    let suggestions = [];

    if (totalProblems < 50) {
        suggestions = [
            "Focus on solving more easy problems to build fundamentals",
            "Learn basic algorithms: sorting, searching, and two pointers",
            "Practice array and string manipulation problems",
            "Start participating in weekly contests to gain experience"
        ];
    } else if (totalProblems < 200) {
        suggestions = [
            "Try more medium difficulty problems to challenge yourself",
            "Learn dynamic programming and graph algorithms",
            "Focus on improving your contest rating",
            "Review your weak areas based on problem categories"
        ];
    } else {
        suggestions = [
            "Challenge yourself with hard problems",
            "Focus on advanced algorithms and data structures",
            "Participate in rated contests regularly",
            "Consider contributing to open source projects"
        ];
    }

    // Add streak-based suggestions
    if (currentStreak === 0) {
        suggestions.push("Start a daily coding streak - consistency is key!");
    } else if (currentStreak < 7) {
        suggestions.push(`Great start! Keep your ${currentStreak}-day streak going!`);
    } else {
        suggestions.push(`Amazing ${currentStreak}-day streak! You're on fire! 🔥`);
    }

    // Add platform-specific suggestions
    if (platformAccounts.length === 1) {
        suggestions.push("Consider connecting more platforms to diversify your practice");
    }

    res.status(200).json({
        status: 'success',
        data: {
            suggestions: suggestions.slice(0, 6), // Limit to 6 suggestions
            userStats: {
                totalProblems,
                avgRating: Math.round(avgRating),
                currentStreak,
                platformCount: platformAccounts.length
            }
        }
    });
});

/**
 * Helper function to generate problem recommendations
 */
const generateProblemRecommendations = async (userStats, difficulty = 'medium') => {
    // This would typically query your problem database or external APIs
    // For now, return sample recommendations based on user level
    const recommendations = {
        easy: [
            { title: "Two Sum", platform: "LeetCode", link: "https://leetcode.com/problems/two-sum/" },
            { title: "Valid Parentheses", platform: "LeetCode", link: "https://leetcode.com/problems/valid-parentheses/" }
        ],
        medium: [
            { title: "Longest Substring Without Repeating Characters", platform: "LeetCode", link: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
            { title: "Add Two Numbers", platform: "LeetCode", link: "https://leetcode.com/problems/add-two-numbers/" }
        ],
        hard: [
            { title: "Median of Two Sorted Arrays", platform: "LeetCode", link: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
            { title: "Regular Expression Matching", platform: "LeetCode", link: "https://leetcode.com/problems/regular-expression-matching/" }
        ]
    };

    return recommendations[difficulty] || recommendations.medium;
};

module.exports = {
    sendMessage,
    getChatHistory,
    clearChatHistory,
    getChatSuggestions
};
