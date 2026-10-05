using DiamondsChatBoadApi.Data.Entities;

namespace DiamondsChatBoadApi.Repository
{
    public interface IProductRepository
    {
        Task<Product> AddAsync(Product product);
        Task<List<Product>> AddRangeAsync(IEnumerable<Product> product);
        Task<Product?> GetByIdAsync(Guid id);
        Task<List<Product>> GetAllData();
        //Task<bool> ExistsByReportNumberAsync(string reportNumber);
    }
}
