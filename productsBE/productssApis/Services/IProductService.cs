using DiamondsChatBoadApi.Models.DTOs;

namespace DiamondsChatBoadApi.Services
{
    public interface IProductService
    {
        Task<ProductDto> AddProductAsync(CreateProductDto dto);
        Task<List<ProductDto>> AddProductsAsync(IEnumerable<CreateProductDto> dtos);
        Task<List<ProductDto>> GetAllProductsList();
    }
}
