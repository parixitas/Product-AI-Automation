using DiamondsChatBoadApi.Data.Entities;
using DiamondsChatBoadApi.Models.DTOs;
using DiamondsChatBoadApi.Repository;

namespace DiamondsChatBoadApi.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _repository;

        public ProductService(IProductRepository repository)
        {
            _repository = repository;
        }

        public async Task<ProductDto> AddProductAsync(CreateProductDto dto)
        {
            var entity = MapToEntity(dto);
            entity.CreatedAt = DateTime.UtcNow;
            var saved = await _repository.AddAsync(entity);
            return MapToDto(saved);
        }

        public async Task<List<ProductDto>> AddProductsAsync(IEnumerable<CreateProductDto> dtos)
        {
            var entities = dtos.Select(MapToEntity).ToList();
            foreach (var e in entities) e.CreatedAt = DateTime.UtcNow;
            var saved = await _repository.AddRangeAsync(entities);
            return saved.Select(MapToDto).ToList();
        }

        public async Task<List<ProductDto>> GetAllProductsList()
        {
            var list = await _repository.GetAllData();
            return list.Select(MapToDto).ToList();
        }

        // Mapping helpers
        private Product MapToEntity(CreateProductDto dto)
        {
            return new Product
            {
                ProductName = dto.ProductName,
                Description = dto.Description ?? string.Empty,
                Price = dto.Price,
                Quantity = dto.Quantity,
                Category = dto.Category ?? string.Empty,
                Brand = dto.Brand ?? string.Empty,
                ProductImage = dto.ProductImage ?? string.Empty,
                IsActive = dto.IsActive
            };
        }

        private ProductDto MapToDto(Product entity)
        {
            return new ProductDto
            {
                ProductId = entity.ProductId,
                ProductName = entity.ProductName,
                Description = entity.Description,
                Price = entity.Price,
                Quantity = entity.Quantity,
                Category = entity.Category,
                Brand = entity.Brand,
                ProductImage = entity.ProductImage,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }
    }
}
