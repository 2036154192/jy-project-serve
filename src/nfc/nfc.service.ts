import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreateNfcDto } from "./dto/create-nfc.dto";
import { UpdateNfcDto } from "./dto/update-nfc.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { NfcEntity } from "./entities/nfc.entity";
import { getConnection, getRepository, Repository } from "typeorm";

export interface NfcRo {
  list: NfcEntity[];
  count: number;
}

let idArr = [];

@Injectable()
export class NfcService {
  constructor(
    @InjectRepository(NfcEntity)
    private readonly nfcRepository: Repository<NfcEntity>
  ) {
  }

  async create(createNfcDto: CreateNfcDto) {
    const { code } = createNfcDto;
    const doc = await this.nfcRepository.findOne({ where: { code: code } });
    if (doc) {
      throw new HttpException("关键字code已存在", HttpStatus.BAD_REQUEST);
    }
    return await this.nfcRepository.save(createNfcDto);
  }

  async findAll(query): Promise<NfcRo> {
    const qb = await getRepository(NfcEntity).createQueryBuilder("nfc");
    qb.where("1 = 1");
    qb.orderBy("nfc.create_time", "DESC");

    const count = await qb.getCount();
    const { currentPage = 1, pageSize = 10, ...params } = query;
    qb.limit(pageSize);
    qb.offset(pageSize * (currentPage - 1));

    const posts = await qb.getMany();
    return { list: posts, count: count };
  }

  findOne(id: number) {
    return `This action returns a #${id} nfc`;
  }

  async findCode(type: string, code: string) {
    if (type === "null") {
      throw new HttpException("没有type", HttpStatus.BAD_REQUEST);
    }
    if (code === "null") {
      throw new HttpException("没有code", HttpStatus.BAD_REQUEST);
    }
    const myType = ["all", "text", "audio", "img"];
    if (myType.indexOf(type) !== -1) {
      let dataType = null;
      switch (type) {
        case "all":
          dataType = ["title", "subhead", "img", "audio"];
          break;
        case "text":
          dataType = ["title", "subhead", "img"];
          break;
        case "audio":
          dataType = "audio";
          break;
        case "img":
          dataType = "img";
          break;
      }
      let db = await getRepository(NfcEntity).createQueryBuilder("nfc")
        .select(dataType)
        .where("nfc.code = :code", { code: code });
      return await db.getRawOne();
    } else {
      throw new HttpException("类型不对", HttpStatus.BAD_REQUEST);
    }
  }

  async update(updateNfcDto: UpdateNfcDto) {
    const { code, title, audio, id, subhead, img } = updateNfcDto;
    await getConnection().createQueryBuilder().update("nfc")
      .set({ code: code, title: title, audio: audio, subhead: subhead, img: img })
      .where("nfc.id = :id", { id: id })
      .execute();
    return `修改成功`;
  }

  async remove(id: string) {
    const db = await getRepository(NfcEntity).createQueryBuilder("nfc");
    const list = await db.getMany();
    idArr = [id];
    traverse(list, id);
    await getConnection().createQueryBuilder().delete().from("nfc")
      .where("nfc.id IN (:...ids)", { ids: idArr })
      .execute();
    return `删除成功`;
  }
}

//遍历数组循环知道没有子
const traverse = (arr: any, id: string) => {
  let myArr: any = [];
  arr.forEach(item => {
    if (item.pid === id) {
      myArr.push(item.id);
    }
  });
  myArr.forEach(item => {
    traverse(arr, item);
  });
  idArr = [...idArr, ...myArr];
  return myArr;
};
