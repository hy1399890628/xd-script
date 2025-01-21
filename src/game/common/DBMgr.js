import fs from 'fs/promises';
import path from 'path';
import logger from "#utils/logger.js";
import createPath from '#utils/path.js';

const resolvePath = createPath(import.meta.url);

class DBMgr {
    constructor() {
        this.AttributeDB = {};          // 属性
        this.EquipmentDB = {};          // 翻译equipmentId
        this.EquipmentQualityDB = {};   // 装备品质
        this.LanguageWordDB = {};       // i18n
        this.SpiritsDB = {};            // 精怪
        this.GameSkillDB = {};          // 神通
        this.SystemInfoDB = {};         // 系统解锁/妖途
        this.initialized = false;
        this.basePath = resolvePath('../config/db');
    }

    static get inst() {
        if (!this._instance) {
            this._instance = new DBMgr();
        }
        return this._instance;
    }

    async initialize() {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        const fileMappings = {
            'AttributeDB.json': 'AttributeDB',
            'EquipmentDB.json': 'EquipmentDB',
            'EquipmentQualityDB.json': 'EquipmentQualityDB',
            'LanguageWordDB.json': 'LanguageWordDB',
            'SpiritsDB.json': 'SpiritsDB',
            'GameSkillDB.json': 'GameSkillDB',
            'RealmsDB.json': 'RealmsDB',
            'SystemInfoDB.json': 'SystemInfoDB'
        };

        try {
            const readPromises = Object.keys(fileMappings).map(async (fileName) => {
                const filePath = path.join(this.basePath, fileName);
                const data = await fs.readFile(filePath, 'utf8');
                this[fileMappings[fileName]] = JSON.parse(data);
            });

            await Promise.all(readPromises);

            logger.debug('All databases initialized successfully.');
        } catch (error) {
            logger.error('Error initializing databases:', error);
        }
    }

    getPreviewSystemIdList() {
        const t = Object.keys(this.SystemInfoDB);
        const previewSystemIdList = [];
        for (let e = 0; e < t.length; ++e) {
            if (this.SystemInfoDB[t[e]].reward !== "0") {
                previewSystemIdList.push(+t[e]);
            }
        }
        return previewSystemIdList;
    }

    getRealms(id) {
        return this.RealmsDB[id] || null;
    }

    getLanguageWord(id) {
        return this.LanguageWordDB[id]?.zh_cn || '未知';
    }

    getEquipment(id) {
        return this.EquipmentDB[id] || {};
    }

    getEquipmentQuality(id) {
        return this.EquipmentQualityDB[id] || null;
    }

    getEquipmentName(id) {
        const equipment = this.getEquipment(id).name || null;
        if (!equipment) {
            return '未知装备';
        }
        return this.getLanguageWord(equipment);
    }

    getAttribute(id) {
        return this.AttributeDB[id] || null;
    }
}

export default DBMgr;
