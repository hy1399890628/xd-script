import GameNetMgr from "#game/net/GameNetMgr.js";
import Protocol from "#game/net/Protocol.js";
import logger from "#utils/logger.js";
import SystemUnlockMgr from "#game/mgr/SystemUnlockMgr.js";
import LoopMgr from "#game/common/LoopMgr.js";
import AdRewardMgr from "#game/mgr/AdRewardMgr.js";
import RegistMgr from '#game/common/RegistMgr.js';

export default class PupilMgr {
    constructor() {
        this.AD_REWARD_DAILY_MAX_NUM = 2;   // 每日最大领取次数
        this.AD_REWARD_CD = 1000;           // 每次间隔时间
        this.isProcessing = false;

        LoopMgr.inst.add(this);
        RegistMgr.inst.add(this);
    }

    static get inst() {
        if (!SystemUnlockMgr.PUPIL) {
            logger.warn(`[宗门管理] ${global.colors.red}系统未解锁${global.colors.reset}`);
            return null;
        }

        if (!this._instance) {
            this._instance = new PupilMgr();
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
        this.getAdRewardTimes = t.getTimes || 0;
        this.lastAdRewardTime = 0;
        this.isProcessing = false;
    }

    countElementsWithoutPupilData(siteList) {
        return siteList.filter((site) => !site.hasOwnProperty("pupilData")).length;
    }

    getGraduationIndices(siteList) {
        return siteList
            .filter((site) => site.pupilData && site.trainTimeInfo && site.pupilData.level * 20 <= site.trainTimeInfo.trainTimes)
            .map((site) => site.index);
    }

    // 自动检查能量 毕业弟子 Loop在CustomMgr中
    async checkGraduatation(t) {
        if (!global.account.switch.pupil) {
            return;
        }
        if (t.ret === 0) {
            // 判断是否可以招人
            const invitationCount = this.countElementsWithoutPupilData(t.siteList);
            if (invitationCount > 0) {
                logger.info(`[宗门管理] 招 ${invitationCount} 人`);
                for (let i = 0; i < invitationCount; i++) {
                    GameNetMgr.inst.sendPbMsg(Protocol.S_PUPIL_RECRUIT, {});
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            // 判断是否可以出师
            const graduationIndices = this.getGraduationIndices(t.siteList);
            if (graduationIndices.length > 0) {
                logger.info(`[宗门管理] 出师 ${graduationIndices.length} 人`);
                for (let i = 0; i < graduationIndices.length; i++) {
                    GameNetMgr.inst.sendPbMsg(Protocol.S_PUPIL_GRADUATE, { siteIndex: graduationIndices[i] });
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    GameNetMgr.inst.sendPbMsg(Protocol.S_PUPIL_RECRUIT, {});
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        }
    }

    processReward() {
        const now = Date.now();
        if (this.getAdRewardTimes < this.AD_REWARD_DAILY_MAX_NUM && now - this.lastAdRewardTime >= this.AD_REWARD_CD) {
            const logContent = `[宗门管理] 还剩 ${this.AD_REWARD_DAILY_MAX_NUM - this.getAdRewardTimes} 次广告激励`;
            AdRewardMgr.inst.AddAdRewardTask({ protoId: Protocol.S_PUPIL_GET_AD_REWARD, data: { isUseADTime: false }, logStr: logContent });
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
                logger.info("[宗门管理] 达到每日最大领取次数，停止奖励领取");
            } else {
                this.processReward();
            }
        } catch (error) {
            logger.error(`[宗门管理] loopUpdate error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }
}
