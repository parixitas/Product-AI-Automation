using DiamondsChatBoadApi.Models.DTOs;
using DiamondsChatBoadApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DiamondsChatBoadApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _service;

        public ProductController(IProductService service)
        {
            _service = service;
        }

        // POST api/product  (single product)
        [HttpPost]
        public async Task<ActionResult<ProductDto>> AddProduct([FromBody] CreateProductDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _service.AddProductAsync(dto);
            return CreatedAtAction(nameof(AddProduct), new { id = result.ProductId }, result);
        }

        // POST api/product/bulk
        [HttpPost("bulk")]
        public async Task<ActionResult<List<ProductDto>>> AddProducts([FromBody] BulkCreateProductDto request)
        {
            if (request?.Dossiers == null || request.Dossiers.Count == 0)
                return BadRequest("No product.");

            var results = await _service.AddProductsAsync(request.Dossiers);
            return Ok(results);
        }

        [HttpGet("GetAllProductsList")]
        public async Task<ActionResult<List<ProductDto>>> GetAllProductsList()
        {
            var results = await _service.GetAllProductsList();
            return Ok(results);
        }
    }
}
