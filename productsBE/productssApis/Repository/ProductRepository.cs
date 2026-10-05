using DiamondsChatBoadApi.Data;
using DiamondsChatBoadApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace DiamondsChatBoadApi.Repository
{
    public class ProductRepository : IProductRepository
    {
        private readonly ApplicationDbContext _context;

        public ProductRepository(ApplicationDbContext context)
        {
            _context = context;
        }


        public async Task<Product> AddAsync(Product product)
        {
            _context.product.Add(product);
            await _context.SaveChangesAsync();
            return product;
        }

        public async Task<List<Product>> AddRangeAsync(IEnumerable<Product> product)
        {
            var list = product.ToList();
            _context.product.AddRange(list);
            await _context.SaveChangesAsync();
            return list;
        }

        public async Task<Product?> GetByIdAsync(Guid id)
        {
            return await _context.product.FindAsync(id);
        }

        public async Task<List<Product>> GetAllData()
        {
            return await _context.product.ToListAsync();
        }
    }
}
