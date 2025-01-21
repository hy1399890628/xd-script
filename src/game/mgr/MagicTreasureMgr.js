import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import AdRewardMgr from "#game/mgr/AdRewardMgr.js";
import SystemUnlockMgr from "#game/mgr/SystemUnlockMgr.js";
import LoopMgr from "#game/common/LoopMgr.js";
import RegistMgr from '#game/common/RegistMgr.js';

export default class MagicTreasureMgr {
    constructor() {
        this.AD_REWARD_DAILY_MAX_NUM = 2; // 每日最大领取次数
        this.AD_REWARD_CD = 1000;         // 每次间隔时间
        this.FREE_NUM = 2;                // 免费抽奖次数
        this.isProcessing = false;

        LoopMgr.inst.add(this);
        RegistMgr.inst.add(this);
    }

    static get inst() {
        if (!SystemUnlockMgr.MAGIC_TREASURE) {
            logger.warn(`[法宝管理] ${global.colors.red}系统未解锁${global.colors.reset}`);
            return null;
        }

        if (!this._instance) {
            this._instance = new MagicTreasureMgr();
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
        this.jackpotData = t.jackpotData;

        // 有时候会出现奇怪的情况，需要重新初始化
        // 如果 jackpotData 的长度小于 jackpotConfig 的长度，则填充 jackpotData
        while (this.jackpotData.length < t.jackpotConfig.length) {
            const nextIndex = this.jackpotData.length;
            this.jackpotData.push({
                poolId: nextIndex + 1,
                freeDrawTimes: 0,
                adFreeTimes: 0,
                lastAdTime: "0"
            });
        }

        // 设置名称
        this.jackpotData.forEach((i, index) => {
            i.name = t.jackpotConfig[index].title;
            // t.jackpotConfig[index].drawItemCostParam删除=号后面的内容
            i.cost = t.jackpotConfig[index].drawItemCostParam.split("=")[0];
        });
        this.isProcessing = false;
    }

    processReward() {
        const now = Date.now();

        for (const pool of this.jackpotData) {
            if (pool.adFreeTimes < this.AD_REWARD_DAILY_MAX_NUM && now - pool.lastAdTime >= this.AD_REWARD_CD) {
                const logContent = `[法宝管理] [${pool.name}] 还剩 ${this.AD_REWARD_DAILY_MAX_NUM - pool.adFreeTimes} 次广告激励`;
                AdRewardMgr.inst.AddAdRewardTask({ protoId: Protocol.S_MAGIC_TREASURE_DRAW_REQ, data: { drawTimes: 1, isAd: true, poolId: pool.poolId, isUseADTime: false }, logStr: logContent });
                pool.adFreeTimes++;
                pool.lastAdTime = now;
            }

            if (pool.freeDrawTimes < this.FREE_NUM) {
                logger.info(`[法宝管理] [${pool.name}] 还剩 ${this.FREE_NUM - pool.freeDrawTimes} 次免费次数`);
                GameNetMgr.inst.sendPbMsg(Protocol.S_MAGIC_TREASURE_DRAW_REQ, { drawTimes: 1, isAd: false, poolId: pool.poolId, itemId: pool.cost });
                pool.freeDrawTimes++;
            }
        }
    }

    async loopUpdate() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (this.jackpotData.every(i => i.adFreeTimes >= this.AD_REWARD_DAILY_MAX_NUM)
                && this.jackpotData.every(i => i.freeDrawTimes >= this.FREE_NUM)) {
                this.clear();
                logger.info("[法宝管理] 达到每日最大领取次数，停止奖励领取");
                this.isProcessing = false;
                return;
            } else {
                this.processReward();
            }
        } catch (error) {
            logger.error(`[法宝管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
