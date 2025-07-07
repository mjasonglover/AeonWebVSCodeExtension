export interface DeviceFrame {
    name: string;
    width: number;
    height: number;
    deviceScaleFactor: number;
    userAgent: string;
    hasFrame: boolean;
    frameImage?: string;
    category: 'desktop' | 'tablet' | 'mobile' | 'custom';
}

export const DEVICE_FRAMES: DeviceFrame[] = [
    // Desktop devices
    {
        name: 'Desktop (1920x1080)',
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        hasFrame: false,
        category: 'desktop'
    },
    {
        name: 'Desktop (1366x768)',
        width: 1366,
        height: 768,
        deviceScaleFactor: 1,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        hasFrame: false,
        category: 'desktop'
    },
    {
        name: 'MacBook Pro 16"',
        width: 1536,
        height: 960,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        hasFrame: false,
        category: 'desktop'
    },
    
    // Tablet devices
    {
        name: 'iPad Pro 12.9"',
        width: 1024,
        height: 1366,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        hasFrame: true,
        frameImage: 'ipad-pro-frame.png',
        category: 'tablet'
    },
    {
        name: 'iPad Air',
        width: 820,
        height: 1180,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        hasFrame: true,
        frameImage: 'ipad-air-frame.png',
        category: 'tablet'
    },
    {
        name: 'Surface Pro 7',
        width: 912,
        height: 1368,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        hasFrame: false,
        category: 'tablet'
    },
    
    // Mobile devices
    {
        name: 'iPhone 14 Pro',
        width: 393,
        height: 852,
        deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        hasFrame: true,
        frameImage: 'iphone-14-pro-frame.png',
        category: 'mobile'
    },
    {
        name: 'iPhone SE',
        width: 375,
        height: 667,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        hasFrame: true,
        frameImage: 'iphone-se-frame.png',
        category: 'mobile'
    },
    {
        name: 'Samsung Galaxy S21',
        width: 360,
        height: 800,
        deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        hasFrame: true,
        frameImage: 'galaxy-s21-frame.png',
        category: 'mobile'
    },
    {
        name: 'Pixel 5',
        width: 393,
        height: 851,
        deviceScaleFactor: 2.75,
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        hasFrame: true,
        frameImage: 'pixel-5-frame.png',
        category: 'mobile'
    },
    
    // Custom
    {
        name: 'Custom',
        width: 800,
        height: 600,
        deviceScaleFactor: 1,
        userAgent: '',
        hasFrame: false,
        category: 'custom'
    }
];

export function getDeviceByName(name: string): DeviceFrame | undefined {
    return DEVICE_FRAMES.find(device => device.name === name);
}

export function getDevicesByCategory(category: 'desktop' | 'tablet' | 'mobile' | 'custom'): DeviceFrame[] {
    return DEVICE_FRAMES.filter(device => device.category === category);
}

export function getOrientations(): Array<{ name: string, rotation: number }> {
    return [
        { name: 'Portrait', rotation: 0 },
        { name: 'Landscape', rotation: 90 }
    ];
}

export function rotateDevice(device: DeviceFrame): DeviceFrame {
    return {
        ...device,
        width: device.height,
        height: device.width
    };
}