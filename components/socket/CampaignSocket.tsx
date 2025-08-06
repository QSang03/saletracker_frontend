"use client";

import { useEffect } from 'react';

export function CampaignSocket({
    onCampaignUpdate,
    onCampaignInteractionLogUpdate,
    onCampaignScheduleUpdate,
}: {
    onCampaignUpdate?: (data: any) => void,
    onCampaignInteractionLogUpdate?: (data: any) => void,
    onCampaignScheduleUpdate?: (data: any) => void,
}) {
    useEffect(() => {
        const handleCampaignUpdate = (event: CustomEvent) => {
            onCampaignUpdate?.(event.detail);
        };

        const handleCampaignInteractionLogUpdate = (event: CustomEvent) => {
            onCampaignInteractionLogUpdate?.(event.detail);
        };

        const handleCampaignScheduleUpdate = (event: CustomEvent) => {
            onCampaignScheduleUpdate?.(event.detail);
        };

        window.addEventListener('ws_campaign_realtime_updated', handleCampaignUpdate as EventListener);
        window.addEventListener('ws_campaign_interaction_log_realtime_updated', handleCampaignInteractionLogUpdate as EventListener);
        window.addEventListener('ws_campaign_schedule_realtime_updated', handleCampaignScheduleUpdate as EventListener);

        return () => {
            window.removeEventListener('ws_campaign_realtime_updated', handleCampaignUpdate as EventListener);
            window.removeEventListener('ws_campaign_interaction_log_realtime_updated', handleCampaignInteractionLogUpdate as EventListener);
            window.removeEventListener('ws_campaign_schedule_realtime_updated', handleCampaignScheduleUpdate as EventListener);
        };
    }, [onCampaignUpdate, onCampaignInteractionLogUpdate, onCampaignScheduleUpdate]);

    return null;
}