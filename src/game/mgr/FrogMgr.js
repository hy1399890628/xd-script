import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import LoopMgr from "#game/common/LoopMgr.js";
import AdRewardMgr from "#game/mgr/AdRewardMgr.js";
import RegistMgr from '#game/common/RegistMgr.js';

export default class FrogMgr {
    constructor() {
        this.AD_REWARD_DAILY_MAX_NUM = 6;   // 每日最大领取次数
        this.AD_REWARD_CD = 5 * 60 * 1000;  // 每次间隔时间 (5分钟)
        this.isProcessing = false;

        LoopMgr.inst.add(this);
        RegistMgr.inst.add(this);
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new FrogMgr();
        }
        return this._instance;
    }

    reset() {
        this._instance = null;
    }
    
    clear() {
        LoopMgr.inst.remove(this);
    }

    checkReward(t) {
        this.isProcessing = true;
        this.getAdRewardTimes = t.getAdRewardTimes || 0;
        this.lastAdRewardTime = t.lastAdRewardTime || 0;
        this.isProcessing = false;
    }

    processReward() {
        const now = Date.now();
        if (this.getAdRewardTimes < this.AD_REWARD_DAILY_MAX_NUM && now - this.lastAdRewardTime >= this.AD_REWARD_CD) {
            const logContent = `[青蛙管理] 还剩 ${this.AD_REWARD_DAILY_MAX_NUM - this.getAdRewardTimes} 次广告激励`;
            AdRewardMgr.inst.AddAdRewardTask({ protoId: Protocol.S_AD_REWARD_GET_REWARD, data: { isUseADTime: false }, logStr: logContent });

            this.getAdRewardTimes++;
            this.lastAdRewardTime = now;
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.getAdRewardTimes >= this.AD_REWARD_DAILY_MAX_NUM) {
                this.clear();
                logger.info("[青蛙管理] 达到每日最大领取次数，停止奖励领取");
            } else {
                this.processReward();
            }
        } catch (error) {
            logger.error(`[青蛙管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
