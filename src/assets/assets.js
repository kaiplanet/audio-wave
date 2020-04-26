import BACKGROUND_DAY_PX from './textures/background_day/px';
import BACKGROUND_DAY_NX from './textures/background_day/nx';
import BACKGROUND_DAY_PY from './textures/background_day/py';
import BACKGROUND_DAY_NY from './textures/background_day/ny';
import BACKGROUND_DAY_PZ from './textures/background_day/pz';
import BACKGROUND_DAY_NZ from './textures/background_day/nz';
import BACKGROUND_NIGHT_PX_LOCAL from './textures/background_night/px';
import BACKGROUND_NIGHT_NX_LOCAL from './textures/background_night/nx';
import BACKGROUND_NIGHT_PY_LOCAL from './textures/background_night/py';
import BACKGROUND_NIGHT_NY_LOCAL from './textures/background_night/ny';
import BACKGROUND_NIGHT_PZ_LOCAL from './textures/background_night/pz';
import BACKGROUND_NIGHT_NZ_LOCAL from './textures/background_night/nz';
import GRASS_MATERIAL from './models/grass.mtl';
import GRASS_OBJECT from './models/grass.obj';
import GRASS_TEXTURE_LOCAL from './textures/grass.dds';
import LENSFLARE_0 from './textures/lensflare/lensflare0';
import LENSFLARE_1 from './textures/lensflare/lensflare1';
import MOON from './textures/moon';
import WATER_OBSTACLE_MAP from './textures/water_obstacle_map';

let BACKGROUND_NIGHT_PX, BACKGROUND_NIGHT_NX, BACKGROUND_NIGHT_PY, BACKGROUND_NIGHT_NY, BACKGROUND_NIGHT_PZ, BACKGROUND_NIGHT_NZ, GRASS_TEXTURE;

switch (process.env.NODE_ENV) {
    case "production":
        BACKGROUND_NIGHT_PX = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/px.jpg";
        BACKGROUND_NIGHT_NX = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/nx.jpg";
        BACKGROUND_NIGHT_PY = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/py.jpg";
        BACKGROUND_NIGHT_NY = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/ny.jpg";
        BACKGROUND_NIGHT_PZ = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/pz.jpg";
        BACKGROUND_NIGHT_NZ = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/background_night/nz.jpg";
        GRASS_TEXTURE = "https://audio-waves.oss-cn-shanghai.aliyuncs.com/grass.dds";

        break;

    case "development":
    default:
        BACKGROUND_NIGHT_PX = BACKGROUND_NIGHT_PX_LOCAL;
        BACKGROUND_NIGHT_NX = BACKGROUND_NIGHT_NX_LOCAL;
        BACKGROUND_NIGHT_PY = BACKGROUND_NIGHT_PY_LOCAL;
        BACKGROUND_NIGHT_NY = BACKGROUND_NIGHT_NY_LOCAL;
        BACKGROUND_NIGHT_PZ = BACKGROUND_NIGHT_PZ_LOCAL;
        BACKGROUND_NIGHT_NZ = BACKGROUND_NIGHT_NZ_LOCAL;
        GRASS_TEXTURE = GRASS_TEXTURE_LOCAL;
}

export { BACKGROUND_DAY_NX, BACKGROUND_DAY_PX, BACKGROUND_DAY_NY, BACKGROUND_DAY_PY, BACKGROUND_DAY_NZ,
    BACKGROUND_DAY_PZ, BACKGROUND_NIGHT_NX, BACKGROUND_NIGHT_PX, BACKGROUND_NIGHT_NY, BACKGROUND_NIGHT_PY,
    BACKGROUND_NIGHT_NZ, BACKGROUND_NIGHT_PZ, GRASS_MATERIAL, GRASS_OBJECT, GRASS_TEXTURE, LENSFLARE_0, LENSFLARE_1,
    MOON, WATER_OBSTACLE_MAP };
