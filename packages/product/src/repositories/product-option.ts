import { Context, DAL, ProductTypes } from "@medusajs/types"
import { DALUtils, MedusaError } from "@medusajs/utils"
import {
  LoadStrategy,
  FilterQuery as MikroFilterQuery,
  FindOptions as MikroOptions,
} from "@mikro-orm/core"
import { SqlEntityManager } from "@mikro-orm/postgresql"
import { Product, ProductOption } from "@models"

// eslint-disable-next-line max-len
export class ProductOptionRepository extends DALUtils.MikroOrmAbstractBaseRepository<ProductOption> {
  protected readonly manager_: SqlEntityManager

  constructor({ manager }: { manager: SqlEntityManager }) {
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    this.manager_ = manager
  }

  async find(
    findOptions: DAL.FindOptions<ProductOption> = { where: {} },
    context: Context = {}
  ): Promise<ProductOption[]> {
    const manager = this.getActiveManager<SqlEntityManager>(context)

    const findOptions_ = { ...findOptions }
    findOptions_.options ??= {}

    Object.assign(findOptions_.options, {
      strategy: LoadStrategy.SELECT_IN,
    })

    return await manager.find(
      ProductOption,
      findOptions_.where as MikroFilterQuery<ProductOption>,
      findOptions_.options as MikroOptions<ProductOption>
    )
  }

  async findAndCount(
    findOptions: DAL.FindOptions<ProductOption> = { where: {} },
    context: Context = {}
  ): Promise<[ProductOption[], number]> {
    const manager = this.getActiveManager<SqlEntityManager>(context)

    const findOptions_ = { ...findOptions }
    findOptions_.options ??= {}

    Object.assign(findOptions_.options, {
      strategy: LoadStrategy.SELECT_IN,
    })

    return await manager.findAndCount(
      ProductOption,
      findOptions_.where as MikroFilterQuery<ProductOption>,
      findOptions_.options as MikroOptions<ProductOption>
    )
  }

  async delete(ids: string[], context: Context = {}): Promise<void> {
    const manager = this.getActiveManager<SqlEntityManager>(context)

    await (manager as SqlEntityManager).nativeDelete(
      ProductOption,
      { id: { $in: ids } },
      {}
    )
  }

  async create(
    data: ProductTypes.CreateProductOptionDTO[],
    context: Context = {}
  ): Promise<ProductOption[]> {
    const manager = this.getActiveManager<SqlEntityManager>(context)
    const productIds: string[] = []

    data.forEach((d) => d.product_id && productIds.push(d.product_id))

    const existingProducts = await manager.find(Product, {
      id: { $in: productIds },
    })

    const existingProductsMap = new Map(
      existingProducts.map<[string, Product]>((product) => [
        product.id,
        product,
      ])
    )

    const productOptions = data.map((optionData) => {
      const productId = optionData.product_id

      delete optionData.product_id

      if (productId) {
        const product = existingProductsMap.get(productId)

        optionData.product_id = product?.id
      }

      return manager.create(ProductOption, optionData)
    })

    manager.persist(productOptions)

    return productOptions
  }

  async update(
    data: ProductTypes.UpdateProductOptionDTO[],
    context: Context = {}
  ): Promise<ProductOption[]> {
    const manager = this.getActiveManager<SqlEntityManager>(context)
    const optionIds = data.map((optionData) => optionData.id)
    const existingOptions = await this.find(
      {
        where: {
          id: {
            $in: optionIds,
          },
        },
      },
      context
    )

    const existingOptionsMap = new Map(
      existingOptions.map<[string, ProductOption]>((option) => [
        option.id,
        option,
      ])
    )

    const productOptions = data.map((optionData) => {
      const existingOption = existingOptionsMap.get(optionData.id)

      if (!existingOption) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `ProductOption with id "${optionData.id}" not found`
        )
      }

      return manager.assign(existingOption, optionData)
    })

    manager.persist(productOptions)

    return productOptions
  }
}
