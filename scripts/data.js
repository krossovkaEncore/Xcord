// Mock Data for Xcord

const CURRENT_USER = {
    id: 'u1',
    name: 'Ilya Krossov', // User from screenshot
    avatar: 'assets/avatars/default_set.png', // Using the spritesheet for now, or just a placeholder
    username: '@krossov'
};

const CHATS = [
    {
        id: 'c1',
        type: 'channel',
        name: "Durov's Channel",
        avatar: 'assets/avatars/default_set.png',
        avatarPos: '100% 0', // CSS object-position for spritesheet hack
        time: '12:25',
        unread: 2,
        pinned: false,
        folder: 'channels', // 'personal', 'groups', 'channels'
        messages: [
            {
                id: 'm1',
                senderId: 'durov',
                senderName: 'Pavel Durov',
                avatar: 'https://via.placeholder.com/40',
                text: 'Welcome to the new Xcord experience. It combines Discord\'s sleek UI with Telegram\'s powerful features.',
                time: '12:25 PM',
                date: 'Today'
            },
            {
                id: 'm2',
                senderId: 'durov',
                senderName: 'Pavel Durov',
                avatar: 'https://via.placeholder.com/40',
                text: 'We are rolling out the "Dark Red" theme to all users starting today.',
                time: '12:26 PM',
                date: 'Today'
            }
        ]
    },
    {
        id: 'c2',
        type: 'personal',
        name: "Saved Messages",
        avatar: 'assets/avatars/default_set.png',
        avatarPos: '0 0',
        time: '12:30',
        unread: 0,
        pinned: true,
        folder: 'personal',
        messages: [
            {
                id: 'm3',
                senderId: 'u1',
                senderName: 'Ilya Krossov',
                avatar: 'assets/avatars/default_set.png',
                text: 'Note to self: Finish the Xcord project by Friday.',
                time: '12:30 PM',
                date: 'Today'
            }
        ]
    },
    {
        id: 'c3',
        type: 'group',
        name: "Xcord Dev Team",
        avatar: 'assets/avatars/default_set.png',
        avatarPos: '0 100%',
        time: 'Yesterday',
        unread: 5,
        pinned: false,
        folder: 'groups',
        messages: [
            {
                id: 'm4',
                senderId: 'dev1',
                senderName: 'Alex',
                avatar: 'https://via.placeholder.com/40',
                text: 'Did we fix the burger menu?',
                time: 'Yesterday at 5:00 PM',
                date: 'Yesterday'
            }
        ]
    },
    {
        id: 'c4',
        type: 'personal',
        name: "Mom",
        avatar: 'assets/avatars/default_set.png',
        avatarPos: '100% 100%',
        time: 'Fri',
        unread: 1,
        pinned: false,
        folder: 'personal',
        messages: [
            {
                id: 'm5',
                senderId: 'mom',
                senderName: 'Mom',
                avatar: 'https://via.placeholder.com/40',
                text: 'Call me when you are free.',
                time: 'Friday at 2:00 PM',
                date: 'Friday'
            }
        ]
    }
];
