import * as vscode from 'vscode';
import { DeviceFrame, DEVICE_FRAMES, getDeviceByName, rotateDevice } from './deviceFrames';

export class ViewportManager {
    private currentDevice: DeviceFrame;
    private isRotated: boolean = false;
    private customSize: { width: number; height: number } | null = null;
    
    constructor(private webview: vscode.Webview) {
        this.currentDevice = DEVICE_FRAMES[0]; // Default to desktop
    }
    
    public async setDevice(deviceName: string): Promise<void> {
        const device = getDeviceByName(deviceName);
        if (!device) return;
        
        this.currentDevice = device;
        this.isRotated = false;
        await this.updateViewport();
    }
    
    public async setCustomSize(width: number, height: number): Promise<void> {
        const customDevice = DEVICE_FRAMES.find(d => d.name === 'Custom')!;
        customDevice.width = width;
        customDevice.height = height;
        this.currentDevice = customDevice;
        this.customSize = { width, height };
        await this.updateViewport();
    }
    
    public async rotate(): Promise<void> {
        if (this.currentDevice.category === 'desktop' || this.currentDevice.category === 'custom') {
            // Don't rotate desktop or custom sizes
            return;
        }
        
        this.isRotated = !this.isRotated;
        await this.updateViewport();
    }
    
    private async updateViewport(): Promise<void> {
        const device = this.isRotated ? rotateDevice(this.currentDevice) : this.currentDevice;
        
        await this.webview.postMessage({
            command: 'setViewport',
            device: {
                ...device,
                isRotated: this.isRotated
            }
        });
    }
    
    public getPreviewContainer(): string {
        const device = this.isRotated ? rotateDevice(this.currentDevice) : this.currentDevice;
        
        if (device.hasFrame && device.frameImage) {
            const frameClass = this.isRotated ? 'device-frame rotated' : 'device-frame';
            return `
                <div class="${frameClass}" 
                     style="background-image: url('${this.getFrameUri(device.frameImage)}');
                            width: ${device.width + 40}px;
                            height: ${device.height + 40}px;">
                    <div class="device-screen" 
                         style="width: ${device.width}px; 
                                height: ${device.height}px;">
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="device-container" 
                     style="width: ${device.width}px; 
                            height: ${device.height}px;">
                </div>
            `;
        }
    }
    
    private getFrameUri(frameImage: string): string {
        // In a real implementation, this would return the proper webview URI
        return `../media/devices/${frameImage}`;
    }
    
    public getCurrentDevice(): DeviceFrame {
        return this.isRotated ? rotateDevice(this.currentDevice) : this.currentDevice;
    }
    
    public getDeviceInfo(): string {
        const device = this.getCurrentDevice();
        return `${device.name} (${device.width}×${device.height})${this.isRotated ? ' - Landscape' : ''}`;
    }
    
    public async zoom(factor: number): Promise<void> {
        await this.webview.postMessage({
            command: 'setZoom',
            factor: factor
        });
    }
    
    public async showRulers(show: boolean): Promise<void> {
        await this.webview.postMessage({
            command: 'toggleRulers',
            show: show
        });
    }
    
    public async showGrid(show: boolean): Promise<void> {
        await this.webview.postMessage({
            command: 'toggleGrid',
            show: show
        });
    }
    
    public async showMediaQueryInfo(show: boolean): Promise<void> {
        await this.webview.postMessage({
            command: 'toggleMediaQueryInfo',
            show: show
        });
    }
    
    public async captureScreenshot(): Promise<void> {
        await this.webview.postMessage({
            command: 'captureScreenshot'
        });
    }
    
    public getSupportedBreakpoints(): Array<{ name: string; width: number }> {
        return [
            { name: 'Mobile', width: 576 },
            { name: 'Tablet', width: 768 },
            { name: 'Desktop', width: 992 },
            { name: 'Large Desktop', width: 1200 },
            { name: 'Extra Large', width: 1400 }
        ];
    }
    
    public async highlightBreakpoint(width: number): Promise<void> {
        await this.webview.postMessage({
            command: 'highlightBreakpoint',
            width: width
        });
    }
}