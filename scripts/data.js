
const CURRENT_USER = {
    id: 'u1',
    name: 'Ilya Krossov',
    username: '@krossov',
    avatar: 'assets/avatars/default_set.png'
};

// Только Jarvis - остальные чаты динамические (P2P пиры)
const CHATS = [
    {
        id: 'jarvis',
        type: 'channel',
        name: 'Jarvis AI',
        avatar: 'assets/avatars/jarvis.png',
        avatarPos: 'center',
        time: 'AI',
        unread: 0,
        pinned: true,
        folder: 'personal',
        messages: [
            {
                id: 'm1',
                senderId: 'jarvis',
                senderName: 'Jarvis AI',
                avatar: 'assets/avatars/jarvis.png',
                text: 'Привет! Я Jarvis - ваш AI помощник.',
                time: '00:00',
                date: 'Сейчас'
            }
        ]
    }
];
